import fs from 'node:fs';
import path from 'node:path';
import {root,load,hash} from './catalog.mjs';
import {inside,localEnvironment} from './local-paths.mjs';
import {DedupStore,candidateOf,digest,durable,shortlist} from './dedup.mjs';

const flags=new Map(),args=process.argv.slice(2),command=args.shift();for(let i=0;i<args.length;i++){if(!args[i].startsWith('--')||!args[i+1])throw Error('Use --name value');flags.set(args[i].slice(2),args[++i]);}
const workspace=fs.realpathSync(path.resolve(flags.get('workspace')||root));inside(workspace,root);Object.assign(process.env,localEnvironment(workspace));
const store=new DedupStore(workspace),read=p=>JSON.parse(fs.readFileSync(inside(workspace,p),'utf8'));
const catalogs=()=>['content/catalog.json','storage/github-publishing/source-catalog.json'].map(p=>({path:p,...read(p)}));
function source(id){const matches=catalogs().flatMap(c=>c.tables.books.filter(b=>b.id===id).map(book=>({book,chapters:c.tables.chapters.filter(ch=>ch.book_id===id).sort((a,b)=>a.position-b.position)})));if(matches.length!==1)throw Error('DEDUP_SOURCE: missing or ambiguous book');return matches[0];}
if(command==='init'){
 const published=load('data/books.json').books,seed=read(flags.get('seed')),entries=published.map(book=>{
  const input=source(book.bookId),candidate=candidateOf(input.book,input.chapters),seedRow=seed.books.find(s=>s.book_id===book.bookId||!s.book_id&&s.title===book.title);
  if(!seedRow||candidate.version!==book.version||candidate.chapters.length!==book.chapters.length||candidate.chapters.some(c=>!book.chapters.some(p=>p.chapterId===c.chapterId&&p.textSha256===c.rawSha256)))throw Error('DEDUP_BASELINE: source/public version differs');
  return {...candidate,workId:'work-'+candidate.bodyFingerprint.slice(0,24),historical:true,publicFingerprint:digest(book),zipSha256:seedRow.zip_sha256||null,zipEvidence:seedRow.zip_sha256?'seed_claim_not_reverified_by_init':'unknown',publicChapterPaths:Object.fromEntries(book.chapters.map(c=>[c.chapterId,path.relative(workspace,path.join(root,'public',c.markdown))])),relationship:null,semanticReview:'unknown',seedProvenance:{catalogKey:seedRow.catalog_key,evidenceLevel:seedRow.evidence_level}};
 });
 // A reviewed relationship annotates history; it never removes either edition.
 const comparison=read(flags.get('comparison'));
 const old=entries.find(e=>e.bookId===comparison.sleepComparison.previousBookId),recent=entries.find(e=>e.bookId===comparison.sleepComparison.candidateBookId);
 if(!old||!recent||comparison.scope.semanticMainTextChapters!==12)throw Error('DEDUP_BASELINE: reviewed sleep evidence required');
 recent.workId=old.workId;recent.relationship={kind:'core_overlap',bookId:old.bookId,workId:old.workId};
 for(const entry of [old,recent]){entry.semanticReview='main_text_core_overlap_reviewed';entry.scope=entry.bookId===old.bookId?'睡眠驅動、作息、測量、常見問題、改善證據與日常安全':'睡眠機制與清醒功能；學習/記憶為擴充重點，其餘與10/22核心範圍重疊';entry.reviewEvidenceSha256=hash(fs.readFileSync(inside(workspace,flags.get('comparison'))));}
 const evidence={publishedCatalogPath:path.relative(workspace,path.join(root,'data/books.json')),publishedCatalogSha256:hash(fs.readFileSync(path.join(root,'data/books.json'))),seedSha256:hash(fs.readFileSync(inside(workspace,flags.get('seed')))),sources:catalogs().map(c=>({path:c.path,sha256:hash(fs.readFileSync(inside(workspace,c.path)))})),coverage:'current published library only; not every historical private artifact'};
 const baseline=path.join(root,'data/dedup-baseline.json');if(fs.existsSync(baseline))throw Error('Baseline already exists');
 const ledger=store.initialize(entries,evidence);durable(baseline,{schemaVersion:1,books:ledger.entries.map(e=>({bookId:e.bookId,version:e.version,sourceFingerprint:e.fingerprint,publicFingerprint:e.publicFingerprint}))});
 console.log(JSON.stringify({revision:ledger.revision,editions:entries.length,provisionalWorks:new Set(entries.map(e=>e.workId)).size,semanticReviewedBooks:2,otherSemanticFields:'unknown'}));
}else if(command==='stage'){
 const input=flags.has('candidate')?read(flags.get('candidate')):source(flags.get('book'));
 console.log(JSON.stringify(store.stage(input.book,input.chapters,{kind:flags.get('kind')||'daily'})));
}else if(command==='review'){const result=store.review(read(flags.get('proof')));console.log(JSON.stringify({revision:result.ledger.revision,candidate:result.result}));
}else if(command==='reserve'){const result=store.reserve(read(flags.get('proof')));console.log(JSON.stringify({revision:result.ledger.revision,reservation:result.result}));
}else if(command==='status'){const ledger=store.load();console.log(JSON.stringify({revision:ledger.revision,completeCoverage:ledger.completeCoverage,editions:ledger.entries.length,candidates:ledger.candidates.map(c=>({bookId:c.bookId,status:c.status,fingerprint:c.fingerprint})),proposals:ledger.proposals,semanticReviewedBooks:ledger.entries.filter(e=>e.semanticReview&&e.semanticReview!=='unknown').length}));
}else if(command==='compare'){
 const ledger=store.load(),candidate=ledger.candidates.find(c=>c.fingerprint===flags.get('fingerprint'));if(!candidate)throw Error('Stage candidate first');
 // This is evidence for the agent to read, never an automatic semantic verdict.
 console.log(JSON.stringify({revision:ledger.revision,candidate,allMetadata:ledger.entries.map(e=>({bookId:e.bookId,title:e.title,chapters:e.chapters.map(c=>c.title)})),requiredComparisons:shortlist(ledger,candidate),closestTexts:shortlist(ledger,candidate).map(row=>{const e=ledger.entries.find(e=>e.bookId===row.bookId&&e.version===row.version);return {bookId:e.bookId,version:e.version,chapters:e.chapters.map(c=>({...c,markdown:store.text(e,c.chapterId)}))};})}));
}else if(command==='export'){
 const projection=store.export(root);console.log(JSON.stringify({revision:projection.revision,books:projection.books.length,sha256:digest(projection),path:'dedup/catalog.json',schedulerAccess:'not tested by this command'}));
}else throw Error('Use init|stage|compare|review|reserve|status|export');
