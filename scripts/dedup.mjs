// Local administrative gate. No network, model API, database or browser state.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {inside,lease} from './local-paths.mjs';

export const digest=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
// Preserve significant code indentation, numbers and citations.
export const normalize=text=>text.normalize('NFC').replace(/\r\n?/g,'\n');
const validId=id=>typeof id==='string'&&/^[\w-]{1,120}$/.test(id);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const seal=value=>({...value,integrity:digest(value)});
const unseal=value=>{const {integrity,...body}=value;if(integrity!==digest(body))throw Error('DEDUP_CORRUPT: ledger integrity differs');return body;};
export function durable(file,value){
 let existing=path.resolve(file);while(!fs.existsSync(existing)){const parent=path.dirname(existing);if(parent===existing)throw Error('DEDUP_PATH');existing=parent;}if(fs.realpathSync(existing)!==existing)throw Error('DEDUP_PATH: linked output is prohibited');
 fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';
 const fd=fs.openSync(temp,'wx');try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 fs.renameSync(temp,file);
}
export function candidateOf(book,chapters,extra={}){
 const bookId=book.id||book.bookId,version=book.version;
 if(!validId(bookId)||!Number.isSafeInteger(version)||version<1||!chapters.length)throw Error('DEDUP_INPUT: stable identity and chapters required');
 const rows=chapters.map(c=>({chapterId:c.id||c.chapterId,title:c.title,rawSha256:digest(c.markdown),normalizedSha256:digest(normalize(c.markdown)),promptSha256:typeof c.prompt==='string'?digest(c.prompt):null}));
 if(rows.some(c=>!validId(c.chapterId)||typeof c.title!=='string')||new Set(rows.map(c=>c.chapterId)).size!==rows.length)throw Error('DEDUP_INPUT: invalid chapter identity');
 const identity={bookId,version,title:book.title,chapters:rows};
 return {...identity,fingerprint:digest(identity),bodyFingerprint:digest(rows.map(c=>c.normalizedSha256).sort()),subtitle:typeof book.subtitle==='string'?book.subtitle:null,series:book.category==='AI 講師與顧問專業養成'?'ai-consultant':book.category==='跨領域知識探索'?'general-knowledge':book.series||null,chapters:rows.map(c=>({...c,coreQuestions:null})),description:book.description||'',category:book.category||'',date:book.date||null,kind:extra.kind||'daily',zipSha256:extra.zipSha256||null,coreQuestions:null,scope:null};
}
const key=e=>e.bookId+'@'+e.version;
const grams=text=>new Set((normalize(text).toLowerCase().match(/[a-z0-9]+|[\u3400-\u9fff]{2,}/g)||[]).flatMap(t=>/^[\u3400-\u9fff]+$/.test(t)?Array.from({length:t.length-1},(_,i)=>t.slice(i,i+2)):[t]));
export function shortlist(ledger,candidate,limit=3){
 const a=grams([candidate.title,candidate.description,...candidate.chapters.map(c=>c.title)].join(' '));
 return ledger.entries.filter(e=>key(e)!==key(candidate)).map(e=>{const b=grams([e.title,e.description,...e.chapters.map(c=>c.title)].join(' '));return {bookId:e.bookId,version:e.version,retrievalScore:[...a].filter(t=>b.has(t)).length};}).sort((a,b)=>b.retrievalScore-a.retrievalScore||a.bookId.localeCompare(b.bookId)).slice(0,limit);
}
const coverage=(ledger,candidate)=>digest(ledger.entries.filter(e=>key(e)!==key(candidate)).map(e=>[key(e),e.fingerprint,e.coreQuestions,e.workId]).sort((a,b)=>a[0].localeCompare(b[0])));
export function evaluate(ledger,candidate){
 if(!ledger.completeCoverage)throw Error('DEDUP_INCOMPLETE: complete published coverage required');
 const same=ledger.entries.find(e=>key(e)===key(candidate));
 if(same&&same.fingerprint!==candidate.fingerprint)return {status:'version_conflict',matches:[same.bookId]};
 const clones=ledger.entries.filter(e=>key(e)!==key(candidate)&&(e.bodyFingerprint===candidate.bodyFingerprint||candidate.zipSha256&&e.zipSha256===candidate.zipSha256));
 if(clones.length){const works=new Set(clones.map(e=>e.workId));return {status:'duplicate',matches:ledger.entries.filter(e=>clones.includes(e)||works.has(e.workId)).map(e=>e.bookId)};}
 return {status:'dedup_review',matches:shortlist(ledger,candidate).map(e=>e.bookId)};
}
function validateLedger(ledger){
 if(ledger.schemaVersion!==1||!Number.isSafeInteger(ledger.revision)||!Array.isArray(ledger.entries)||!Array.isArray(ledger.candidates)||!Array.isArray(ledger.proposals))throw Error('DEDUP_CORRUPT: invalid ledger schema');
 if(new Set(ledger.entries.map(key)).size!==ledger.entries.length||ledger.entries.some(e=>!validId(e.bookId)||!e.chapters.length))throw Error('DEDUP_CORRUPT: duplicate or invalid edition');
 return ledger;
}
export class DedupStore{
 constructor(workspace){this.workspace=fs.realpathSync(workspace);this.dir=inside(this.workspace,'storage/github-publishing/dedup');this.file=inside(this.workspace,path.join(this.dir,'ledger.json'));}
 load(){if(!fs.existsSync(this.file))throw Error('DEDUP_UNAVAILABLE: initialize the work ledger before new generation');const ledger=validateLedger(unseal(read(this.file)));
  if(ledger.sourceEvidence.publishedCatalogPath){const published=read(inside(this.workspace,ledger.sourceEvidence.publishedCatalogPath)).books;for(const book of published){const entry=ledger.entries.find(e=>e.bookId===book.bookId&&e.version===book.version);if(!entry||entry.chapters.length!==book.chapters.length||entry.chapters.some(c=>!book.chapters.some(p=>p.chapterId===c.chapterId&&p.textSha256===c.rawSha256)))throw Error('DEDUP_INCOMPLETE: published coverage changed');}}
  return ledger;}
 update(expectedRevision,mutate){const release=lease(this.workspace,'github-dedup');try{
  const old=this.load();if(old.revision!==expectedRevision)throw Error('DEDUP_CONFLICT: stale ledger revision');
  return this.#commit(old,mutate);
 }finally{release();}}
 #commit(old,mutate){
  const before=path.join(this.dir,'history',String(old.revision).padStart(8,'0')+'.json');
  if(fs.existsSync(before)){if(digest(read(before))!==digest(seal(old)))throw Error('DEDUP_CORRUPT: history differs');}else durable(before,seal(old));
  const next=structuredClone(old),result=mutate(next);next.revision++;next.updatedAt=new Date().toISOString();validateLedger(next);durable(this.file,seal(next));return {ledger:next,result};
 }
 initialize(entries,sourceEvidence){const release=lease(this.workspace,'github-dedup');try{
  if(fs.existsSync(this.file))throw Error('DEDUP_EXISTS: initialization cannot replace an existing ledger');
  const value={schemaVersion:1,revision:1,updatedAt:new Date().toISOString(),completeCoverage:true,sourceEvidence,entries,candidates:[],proposals:[],events:[{type:'historical_import',count:entries.length}]};validateLedger(value);durable(this.file,seal(value));return value;
 }finally{release();}}
 stage(book,chapters,extra={}){
  const candidate=candidateOf(book,chapters,extra),current=this.load();
  if(!current.completeCoverage)throw Error('DEDUP_INCOMPLETE: complete published coverage required');
  const existing=current.entries.find(e=>key(e)===key(candidate)&&e.fingerprint===candidate.fingerprint);
  if(existing?.historical||existing?.publication)return {candidate,status:'existing',duplicate:true};
  const previous=current.candidates.find(c=>c.fingerprint===candidate.fingerprint);
  if(previous&&['revision','supplement'].includes(previous.decision)&&candidate.kind==='daily')throw Error('DEDUP_RELATED: related editions cannot consume a daily slot');
  if(previous){const check=evaluate(current,candidate);if(previous.status==='approved'&&previous.coverageHash===coverage(current,candidate))return {...previous,candidate,duplicate:true};if(check.status===previous.status)return {...previous,candidate,duplicate:true};}
  const input=inside(this.workspace,path.join(this.dir,'inputs',candidate.fingerprint+'.json'));
  if(fs.existsSync(input)){if(digest(read(input))!==digest({book,chapters}))throw Error('DEDUP_INPUT_CONFLICT');}else durable(input,{book,chapters});
  const result=evaluate(current,candidate);
  const {result:row}=this.update(current.revision,ledger=>{const row={...candidate,...result,inputPath:path.relative(this.workspace,input),updatedAt:new Date().toISOString()};ledger.candidates=ledger.candidates.filter(c=>c.fingerprint!==candidate.fingerprint);ledger.candidates.push(row);ledger.events.push({type:'candidate',fingerprint:candidate.fingerprint,status:row.status});return row;});
  return {...row,candidate};
 }
 text(entry,chapterId){
  const chapter=entry.chapters.find(c=>c.chapterId===chapterId);if(!chapter)throw Error('DEDUP_EVIDENCE: unknown chapter');
  let text;if(entry.publicChapterPaths?.[chapterId])text=fs.readFileSync(inside(this.workspace,entry.publicChapterPaths[chapterId]),'utf8');else{
   const input=read(inside(this.workspace,entry.inputPath));text=input.chapters.find(c=>(c.id||c.chapterId)===chapterId)?.markdown;
  }
  if(typeof text!=='string'||digest(text)!==chapter.rawSha256)throw Error('DEDUP_EVIDENCE: source version changed');return text;
 }
 review(proof){
  const current=this.load(),candidate=current.candidates.find(c=>c.fingerprint===proof.candidateFingerprint);if(!candidate)throw Error('DEDUP_REVIEW: stage candidate first');
  if(proof.expectedRevision!==current.revision)throw Error('DEDUP_CONFLICT: stale review');
  if(!['new_work','duplicate','revision','supplement'].includes(proof.decision)||typeof proof.reason!=='string'||proof.reason.length<30||!['agent','human'].includes(proof.reviewer))throw Error('DEDUP_REVIEW: explicit substantive decision required');
  const required=shortlist(current,candidate).map(e=>e.bookId),metadata=new Set(proof.metadataReviewedBookIds||[]);
  if(current.entries.some(e=>!metadata.has(e.bookId)))throw Error('DEDUP_INCOMPLETE: metadata coverage missing');
  const comparisons=proof.comparisons||[];
  if(required.some(id=>!comparisons.some(c=>c.bookId===id)))throw Error('DEDUP_REVIEW: closest candidates must be compared');
  for(const comparison of comparisons){
   const entry=current.entries.find(e=>e.bookId===comparison.bookId&&e.version===comparison.version);
   if(!entry||!Array.isArray(comparison.sharedQuestions)||!Array.isArray(comparison.newCapabilities)||typeof comparison.reason!=='string'||comparison.reason.length<30||!comparison.evidence?.length)throw Error('DEDUP_EVIDENCE: substantive comparison required');
   if(!['selected_passages','full_chapters'].includes(comparison.evidenceScope)||!Array.isArray(comparison.chapterComparisons)||comparison.chapterComparisons.length!==candidate.chapters.length||candidate.chapters.some(ch=>!comparison.chapterComparisons.some(row=>row.candidateChapterId===ch.chapterId&&Array.isArray(row.sharedQuestions)&&Array.isArray(row.referenceChapterIds)&&row.referenceChapterIds.every(id=>entry.chapters.some(c=>c.chapterId===id))&&typeof row.distinctContribution==='string'&&row.distinctContribution.length>=20)))throw Error('DEDUP_EVIDENCE: compare every candidate chapter and state actual reading scope');
   for(const evidence of comparison.evidence){const chapter=entry.chapters.find(c=>c.chapterId===evidence.chapterId),text=this.text(entry,evidence.chapterId);if(chapter?.rawSha256!==evidence.sha256||typeof evidence.quote!=='string'||evidence.quote.trim().length<30||!text.includes(evidence.quote))throw Error('DEDUP_EVIDENCE: quote/hash must match actual text');}
   if(comparison.evidenceScope==='full_chapters'&&entry.chapters.some(ch=>!comparison.evidence.some(e=>e.chapterId===ch.chapterId)))throw Error('DEDUP_EVIDENCE: full-chapter claim requires evidence from every reference chapter');
   if(proof.decision==='new_work'&&!comparison.newCapabilities.some(x=>typeof x==='string'&&x.length>=15))throw Error('DEDUP_REVIEW: explain distinct capability, not just changed wording');
  }
  if(!Array.isArray(proof.chapterQuestions)||proof.chapterQuestions.length!==candidate.chapters.length||candidate.chapters.some(c=>!proof.chapterQuestions.some(q=>q.chapterId===c.chapterId&&Array.isArray(q.questions)&&q.questions.some(x=>typeof x==='string'&&x.length>=10)))||typeof proof.scope!=='string'||proof.scope.length<30)throw Error('DEDUP_REVIEW: chapter learning questions and scope required');
  const questions=proof.chapterQuestions.flatMap(q=>q.questions).map(normalize).sort();
  const equalQuestions=current.entries.filter(e=>key(e)!==key(candidate)&&e.coreQuestions&&digest(e.coreQuestions.map(normalize).sort())===digest(questions));
  const exact=evaluate(current,candidate);
  if(proof.decision==='new_work'&&(exact.status==='duplicate'||exact.status==='version_conflict'||equalQuestions.length))throw Error('DEDUP_DUPLICATE: same text, version conflict or identical learning questions');
  if(proof.decision!=='new_work'&&!current.entries.some(e=>e.workId===proof.relatedWorkId))throw Error('DEDUP_REVIEW: real related work required');
  if(['revision','supplement'].includes(proof.decision)&&candidate.kind==='daily')throw Error('DEDUP_RELATED: revisions/supplements require ad-hoc intake, not a daily new work');
  const workId=proof.decision==='new_work'?'work-'+candidate.bodyFingerprint.slice(0,24):proof.relatedWorkId;
  const proofPath=inside(this.workspace,path.join(this.dir,'reviews',digest(proof)+'.json'));if(!fs.existsSync(proofPath))durable(proofPath,proof);
  return this.update(current.revision,ledger=>{
   const row=ledger.candidates.find(c=>c.fingerprint===candidate.fingerprint);Object.assign(row,{status:proof.decision==='duplicate'?'duplicate':'approved',decision:proof.decision,workId,coreQuestions:questions,chapterQuestions:proof.chapterQuestions,chapters:row.chapters.map(c=>({...c,coreQuestions:proof.chapterQuestions.find(q=>q.chapterId===c.chapterId).questions})),scope:proof.scope,semanticReview:'chapter_questions_and_recorded_comparisons',coverageHash:coverage(ledger,candidate),reviewPath:path.relative(this.workspace,proofPath),reviewSha256:digest(proof),reviewedAt:new Date().toISOString()});
   if(row.status==='approved'){const entry={...row,historical:false,relationship:proof.decision==='new_work'?null:{kind:proof.decision,workId:proof.relatedWorkId}};const previous=ledger.entries.find(e=>key(e)===key(row));if(previous&&previous.fingerprint!==row.fingerprint)throw Error('DEDUP_CONFLICT: edition cannot be overwritten');ledger.entries=ledger.entries.filter(e=>key(e)!==key(row));ledger.entries.push(entry);}
   ledger.events.push({type:'review',fingerprint:row.fingerprint,decision:row.decision,workId});return row;
  });
 }
 assert(candidate){
  const ledger=this.load();if(!ledger.completeCoverage)throw Error('DEDUP_INCOMPLETE');
  const entry=ledger.entries.find(e=>key(e)===key(candidate)&&e.fingerprint===candidate.fingerprint);
  if(entry?.historical||entry?.publication)return entry;
  const row=ledger.candidates.find(c=>c.fingerprint===candidate.fingerprint);
  if(!entry||row?.status!=='approved'||row.coverageHash!==coverage(ledger,candidate))throw Error('DEDUP_REVIEW: missing or stale admission; no generation or publication');
  if(digest(read(inside(this.workspace,row.reviewPath)))!==row.reviewSha256)throw Error('DEDUP_EVIDENCE: changed review');return entry;
 }
 async withPublication(candidate,publicBook,operation){
  const release=lease(this.workspace,'github-dedup');try{
   this.assert(candidate);const result=await operation(),current=this.load();
   this.#commit(current,ledger=>{ledger.entries.find(e=>key(e)===key(candidate)).publication={fingerprint:digest(publicBook),at:new Date().toISOString()};ledger.events.push({type:'published',bookId:candidate.bookId,version:candidate.version});});return result;
  }finally{release();}
 }
 conflict(record){const ledger=this.load();return this.update(ledger.revision,next=>{next.conflicts||=[];const identity=digest(record);if(!next.conflicts.some(c=>c.identity===identity))next.conflicts.push({...record,identity,at:new Date().toISOString()});next.events.push({type:'version_conflict',bookId:record.bookId});});}
 export(site){inside(this.workspace,site);const projection=publicProjection(this.load(),read(path.join(site,'data/books.json')).books);durable(path.join(site,'public/dedup/catalog.json'),projection);return projection;}
 reserve(proof){
  const ledger=this.load();if(!/^\d{4}-\d{2}-\d{2}$/.test(proof.date||'')||!validId(proof.proposalId)||!Array.isArray(proof.questions)||proof.questions.length<6||proof.questions.some(q=>typeof q!=='string'||q.length<10))throw Error('DEDUP_PROPOSAL: 6+ substantive questions required');
  return this.update(proof.expectedRevision,next=>{const old=next.proposals.find(p=>p.proposalId===proof.proposalId);if(old){const {acceptedAt,...previous}=old,{expectedRevision,...incoming}=proof;if(digest(previous)!==digest(incoming))throw Error('DEDUP_PROPOSAL_CONFLICT');return old;}
   const questionHash=digest(proof.questions.map(normalize).sort());if(next.proposals.some(p=>p.date===proof.date&&digest(p.questions.map(normalize).sort())===questionHash))throw Error('DEDUP_PROPOSAL_DUPLICATE');
   const {expectedRevision,...data}=proof,row={...data,acceptedAt:new Date().toISOString()};next.proposals.push(row);next.events.push({type:'topic_reserved',proposalId:row.proposalId});return row;
  });
 }
}

export function sourceAdmission(workspace,book,chapters){return new DedupStore(workspace).assert(candidateOf(book,chapters));}
export function publicationAdmission(site,input){
 const baseline=read(path.join(site,'data/dedup-baseline.json')),historical=baseline.books.find(b=>b.bookId===input.book.bookId&&b.version===input.book.version&&b.publicFingerprint===digest(input.book));if(historical)return {historical:true};
 const workspace=fs.realpathSync(input.dedupWorkspace||site);inside(workspace,site);const store=new DedupStore(workspace),row=store.load().entries.find(e=>e.bookId===input.book.bookId&&e.version===input.book.version);
 if(!row||row.historical||row.chapters.length!==input.book.chapters.length||row.chapters.some(c=>!input.book.chapters.some(p=>p.chapterId===c.chapterId&&p.textSha256===c.rawSha256))||row.title!==input.book.title)throw Error('DEDUP_REVIEW: publication source differs from its approved baseline');
 if(row.publication&&row.publication.fingerprint!==digest(input.book))throw Error('DEDUP_CONFLICT: published edition cannot be replaced');
 store.assert(row);return {store,candidate:row};
}

export function publicProjection(ledger,published){
 if(!ledger.completeCoverage)throw Error('DEDUP_INCOMPLETE');
 return {schemaVersion:1,revision:ledger.revision,ledgerSha256:digest(ledger),coverage:{publishedBooks:published.length,publishedChapters:published.flatMap(b=>b.chapters).length,metadataComplete:true,bodySemanticReviewedBooks:ledger.entries.filter(e=>e.semanticReview&&e.semanticReview!=='unknown'&&published.some(b=>b.bookId===e.bookId)).length,remainingSemanticAnalysis:'unknown'},rules:['Compare actual learning questions and closest full texts before writing.','A new ID/date, different title, cases or hashes do not establish a new work.','Read-only snapshot: same-day reservations require the local coordinator; read success alone is not synchronization.'],books:published.map(book=>{
  const e=ledger.entries.find(e=>e.bookId===book.bookId&&e.version===book.version);if(!e)throw Error('DEDUP_INCOMPLETE: missing public edition');
  return {bookId:e.bookId,workId:e.workId,version:e.version,title:book.title,subtitle:e.subtitle||null,description:book.description,date:book.date,series:book.category,scope:e.scope,semanticReview:e.semanticReview,relationship:e.relationship,chapters:book.chapters.map(c=>({chapterId:c.chapterId,title:c.title,textSha256:c.textSha256,coreQuestions:e.chapterQuestions?.find(q=>q.chapterId===c.chapterId)?.questions||null,textUrl:'https://guizhan21.github.io/chapters/'+c.chapterId+'.md'}))};
 })};
}

export function validateProjection(projection,published,baseline){
 if(projection.schemaVersion!==1||!Number.isSafeInteger(projection.revision)||projection.coverage.metadataComplete!==true||projection.books.length!==published.length||projection.coverage.publishedBooks!==published.length||projection.coverage.publishedChapters!==published.flatMap(b=>b.chapters).length||new Set(projection.books.map(b=>b.bookId)).size!==published.length)throw Error('DEDUP_PROJECTION: incomplete catalog');
 for(const book of published){const row=projection.books.find(e=>e.bookId===book.bookId&&e.version===book.version);if(!row||row.title!==book.title||row.chapters.length!==book.chapters.length||row.chapters.some(c=>!book.chapters.some(p=>p.chapterId===c.chapterId&&p.textSha256===c.textSha256&&p.title===c.title))||row.chapters.some(c=>c.textUrl!=='https://guizhan21.github.io/chapters/'+c.chapterId+'.md'))throw Error('DEDUP_PROJECTION: stale chapter identity');}
 for(const frozen of baseline.books){const book=published.find(b=>b.bookId===frozen.bookId&&b.version===frozen.version);if(!book||digest(book)!==frozen.publicFingerprint)throw Error('DEDUP_BASELINE: historical edition changed');}
 const allowed={root:['schemaVersion','revision','ledgerSha256','coverage','rules','books'],book:['bookId','workId','version','title','subtitle','description','date','series','scope','semanticReview','relationship','chapters'],chapter:['chapterId','title','textSha256','coreQuestions','textUrl']};
 if(Object.keys(projection).some(k=>!allowed.root.includes(k))||projection.books.some(b=>Object.keys(b).some(k=>!allowed.book.includes(k))||b.chapters.some(c=>Object.keys(c).some(k=>!allowed.chapter.includes(k)))))throw Error('DEDUP_PROJECTION: private fields are not allowed');
 return true;
}
