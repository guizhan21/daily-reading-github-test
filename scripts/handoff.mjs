// Local completed-book adapter. Reads JSON and existing NotebookLM checkpoints only.
// No database, cloud storage SDK, browser credentials or remote generation API.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {root,load,hash} from './catalog.mjs';import {atomic,fingerprint} from './publisher.mjs';import {inside,localEnvironment} from './local-paths.mjs';
import {sourceAdmission} from './dedup.mjs';
const args=process.argv.slice(2),flags=new Map();for(let n=0;n<args.length;n++){if(args[n]==='--publish'){flags.set('publish',true);continue;}if(!args[n].startsWith('--')||!args[n+1])throw Error('Use --name value');flags.set(args[n].slice(2),args[++n]);}
const workspace=fs.realpathSync(path.resolve(flags.get('workspace')||root));inside(workspace,root);Object.assign(process.env,localEnvironment(workspace));
const id=flags.get('book');if(!/^[\w-]{1,100}$/.test(id||''))throw Error('Stable --book ID required');
const c=JSON.parse(fs.readFileSync(inside(workspace,flags.get('catalog')||'content/catalog.json'))).tables;
const source=c.books.find(b=>b.id===id&&!b.deleted_at),jobRoot=inside(workspace,'storage/github-publishing/'+id);fs.mkdirSync(jobRoot,{recursive:true});
const jobFile=path.join(jobRoot,'handoff.json'),job=fs.existsSync(jobFile)?JSON.parse(fs.readFileSync(jobFile)):{bookId:id,events:[]};
const status=(state,extra={})=>{Object.assign(job,extra,{status:state,at:new Date().toISOString()});job.events.push({at:job.at,status:state,...extra});atomic(jobFile,job);};
if(!source){status('waiting_book');console.log(JSON.stringify({bookId:id,status:'waiting_book'}));process.exit(0);}
const chapters=c.chapters.filter(ch=>ch.book_id===id).sort((a,b)=>a.position-b.position),audioRoot=inside(workspace,flags.get('audio-dir')||'storage/audio');
try{sourceAdmission(workspace,source,chapters);}catch(e){status('dedup_review',{reason:e.message});throw e;}
const pending=chapters.filter(ch=>!c.audio_assets.some(a=>a.chapter_id===ch.id&&a.content_hash===ch.content_hash));if(!chapters.length||pending.length){status('waiting_audio',{pending:pending.map(ch=>ch.id)});console.log(JSON.stringify({bookId:id,status:job.status,pending:job.pending}));process.exit(0);}
const approvalFile=inside(workspace,flags.get('approval')||path.join(root,'data/publication-rights.json')),approvalData=JSON.parse(fs.readFileSync(approvalFile));
const approval=(approvalData.books||[approvalData]).find(r=>r.bookId===id&&r.version===source.version&&r.decision==='approved');if(!approval){status('waiting_public_rights');throw Error('Explicit, hash-bound public rights review required');}
status('verifying_sources');
const existing=load('data/books.json').books.find(b=>b.bookId===id),tag=existing?new URL(existing.chapters[0].audioUrl).pathname.split('/').at(-2):'audio-'+id.replace('_','-')+'-v'+source.version;
const staging=inside(workspace,path.join(jobRoot,'v'+source.version));fs.mkdirSync(staging,{recursive:true});
const result=[];
for(const ch of chapters){const a=c.audio_assets.find(a=>a.chapter_id===ch.id&&a.content_hash===ch.content_hash),review=approval.chapters.find(r=>r.chapterId===ch.id);if(!review||review.audioSha256!==a.hash||review.textSha256!==hash(ch.markdown))throw Error('Reviewed chapter changed');
 const stateRoot=inside(workspace,flags.get('state-root')||'storage/notebooklm'),state=JSON.parse(fs.readFileSync(inside(workspace,path.join(stateRoot,ch.id,ch.content_hash.slice(0,16),'state.json'))));
 if(state.status!=='playable'||state.contentHash!==ch.content_hash||state.audioSha256!==a.hash||!state.artifactSourcesVerified||state.sourceCount!==1)throw Error('Original chapter has no accepted NotebookLM checkpoint');
 const name=ch.id+'-'+a.hash.slice(0,12)+'.m4a',candidates=[inside(workspace,path.join(audioRoot,name)),inside(workspace,a.path)],file=candidates.find(p=>fs.existsSync(p));if(!file){status('waiting_original_audio',{chapterId:ch.id});throw Error('Recover the existing artifact; do not generate it again');}
 const bytes=fs.readFileSync(file);if(bytes.length!==a.bytes||hash(bytes)!==a.hash)throw Error('Original audio bytes differ');
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,codec_type','-of','json',file],{encoding:'utf8',windowsHide:true}));if(!probe.streams.some(s=>s.codec_type==='audio'&&s.codec_name==='aac')||Math.abs(Number(probe.format.duration)-a.duration)>1)throw Error('Invalid audio format/duration');
 execFileSync('ffmpeg',['-nostdin','-v','error','-protocol_whitelist','file,pipe','-i',file,'-map','0:a:0','-f','null','-'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
 const copy=inside(workspace,path.join(staging,name));if(fs.existsSync(copy)){if(hash(fs.readFileSync(copy))!==a.hash)throw Error('Staging conflict');}else fs.copyFileSync(file,copy);
 result.push({ch,a,name});
}
const sourceCover=c.cover_assets.find(a=>a.book_id===id),coverFile=inside(workspace,flags.get('cover')||sourceCover?.path||'missing-cover');if(!fs.existsSync(coverFile)){status('waiting_original_cover');throw Error('Original cover is not available');}
const coverBytes=fs.readFileSync(coverFile);if(hash(coverBytes)!==approval.coverSha256)throw Error('Original cover differs from approval');
const ext=path.extname(coverFile).toLowerCase();if(!['.jpg','.png','.webp','.svg'].includes(ext))throw Error('Cover format');const cover='covers/'+id+ext,refs='references/'+id+'.md';
for(const p of ['public/references','public/chapters','public/covers'])inside(workspace,path.join(root,p));
fs.mkdirSync(path.join(root,'public/references'),{recursive:true});fs.mkdirSync(path.join(root,'public/chapters'),{recursive:true});fs.mkdirSync(path.join(root,'public/covers'),{recursive:true});fs.writeFileSync(path.join(root,'public',cover),coverBytes);fs.writeFileSync(path.join(root,'public',refs),(source.references_md||'參考來源請見各章正文引註。').trimEnd()+'\n');
for(const {ch} of result)fs.writeFileSync(path.join(root,'public/chapters',ch.id+'.md'),ch.markdown);
const book={bookId:id,title:source.title,category:source.category,date:source.date,description:source.description,version:source.version,cover,coverKind:ext==='.svg'?'original-template':'original-image',references:refs,releaseUrl:'https://github.com/'+load('data/site.json').repository+'/releases/tag/'+tag,chapters:result.map(({ch,a,name})=>({chapterId:ch.id,title:ch.title,markdown:'chapters/'+ch.id+'.md',textSha256:hash(ch.markdown),audioUrl:'https://github.com/'+load('data/site.json').repository+'/releases/download/'+tag+'/'+name,sha256:a.hash,bytes:a.bytes,durationSec:existing?.chapters.find(c=>c.chapterId===ch.id&&c.sha256===a.hash)?.durationSec??a.duration}))};
const publicRights=load('data/publication-rights.json'),previous=publicRights.books.find(r=>r.bookId===id&&r.version===source.version);if(previous&&fingerprint(previous)!==fingerprint(approval))throw Error('Public rights record differs');if(!previous){publicRights.books.push(approval);atomic(path.join(root,'data/publication-rights.json'),publicRights);}
const manifest={schemaVersion:1,repository:load('data/site.json').repository,tag,rightsReviewed:true,rightsBasis:approval.basis,book,dedupWorkspace:workspace,files:result.map(({ch,a,name})=>({chapterId:ch.id,file:name,sha256:a.hash,bytes:a.bytes})),...(existing?{expectedCatalogBookHash:fingerprint(existing),allowPublishedAppend:true}:{})};
atomic(path.join(staging,'publish.json'),manifest);status('ready_to_publish',{version:source.version,chapters:chapters.length,manifestSha256:fingerprint(manifest)});
if(flags.get('publish')){try{const output=execFileSync(process.execPath,['scripts/publish-audio.mjs',path.join(staging,'publish.json')],{cwd:root,env:{...process.env,AUDIO_STAGING_ROOT:staging},encoding:'utf8',windowsHide:true});const report=JSON.parse(output.trim());status('catalog_ready',{publication:report});console.log(JSON.stringify(report));}catch(e){status('publication_blocked',{reason:e.message.slice(0,400)});throw e;}}
else console.log(JSON.stringify({bookId:id,status:'ready_to_publish',chapters:chapters.length}));
