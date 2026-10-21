import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {hash,validate} from './catalog.mjs';
export const fingerprint=value=>hash(Buffer.from(JSON.stringify(value)));
export function sourceCheck(input,dir,config){
 if(input.repository!==config.repository||input.repository==='guizhan21/daily-audio-library'||input.rightsReviewed!==true||typeof input.rightsBasis!=='string'||input.rightsBasis.length<20||!/^audio-[\w.-]+$/.test(input.tag))throw Error('RIGHTS_OR_TARGET: explicit, reviewed public rights required');
 validate({schemaVersion:1,books:[input.book]},config);
 if(!Array.isArray(input.files)||input.files.length!==input.book.chapters.length||new Set(input.files.map(x=>x.chapterId)).size!==input.files.length)throw Error('INCOMPLETE: one original per chapter required');
 for(const a of input.files){if(path.basename(a.file)!==a.file||!/^[-\w]+\.(m4a|aac)$/.test(a.file))throw Error('PATH: unsafe audio filename');const p=path.join(dir,a.file);if(!fs.existsSync(p)||fs.realpathSync(p)!==p||fs.lstatSync(p).isSymbolicLink())throw Error('MISSING_SOURCE: original media required');const b=fs.readFileSync(p),c=input.book.chapters.find(c=>c.chapterId===a.chapterId);if(!c||c.sha256!==a.sha256||c.bytes!==a.bytes||a.bytes!==b.length||hash(b)!==a.sha256||!c.audioUrl.endsWith('/'+input.tag+'/'+a.file))throw Error('HASH: source differs; no upload permitted');}
 return true;
}
export function mergeBook(catalog,input){
 const old=catalog.books.find(b=>b.bookId===input.book.bookId);if(old&&fingerprint(old)===fingerprint(input.book))return {catalog,added:0,updated:0};
 if(old){if(input.expectedCatalogBookHash!==fingerprint(old)||old.chapters.some(ch=>!input.book.chapters.some(n=>n.chapterId===ch.chapterId&&n.sha256===ch.sha256&&n.audioUrl===ch.audioUrl&&n.textSha256===ch.textSha256)))throw Error('CATALOG_CONFLICT: current book differs from reviewed baseline');}
 return {catalog:{...catalog,books:old?catalog.books.map(b=>b.bookId===old.bookId?input.book:b):[...catalog.books,input.book]},added:old?0:1,updated:old?1:0};
}
export function atomic(file,value){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');fs.renameSync(tmp,file);}
export async function publish(input,{root,dir,jobs,config,stopAfterUploads=Infinity,stageOnly=false}){
 sourceCheck(input,dir,config);
 const rights=JSON.parse(fs.readFileSync(path.join(root,'data/publication-rights.json'))).books.find(b=>b.bookId===input.book.bookId&&b.version===input.book.version&&b.decision==='approved');
 if(!rights)throw Error('RIGHTS: version has no publication review');
 for(const ch of input.book.chapters){const review=rights.chapters.find(c=>c.chapterId===ch.chapterId);if(!review||review.audioSha256!==ch.sha256||review.textSha256!==ch.textSha256||hash(fs.readFileSync(path.join(root,'public',ch.markdown)))!==ch.textSha256)throw Error('RIGHTS: chapter version differs');}
 const cover=path.join(root,'public',input.book.cover);if(fs.existsSync(cover)){if(hash(fs.readFileSync(cover))!==rights.coverSha256)throw Error('COVER_HASH: original cover differs');}else if(!stageOnly)throw Error('COVER_PENDING: original cover must be recovered before publication');
 fs.mkdirSync(jobs,{recursive:true});if(fs.realpathSync(jobs)!==jobs)throw Error('Linked job directory');
 const gh=args=>execFileSync('gh',args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,windowsHide:true});
 const repo=JSON.parse(gh(['repo','view',input.repository,'--json','nameWithOwner,visibility']));if(repo.nameWithOwner!==config.repository||repo.visibility!=='PUBLIC')throw Error('TARGET: dedicated public repository required');
 const jobPath=path.join(jobs,input.book.bookId+'-v'+input.book.version+'.json'),id=fingerprint(input.book),previous=fs.existsSync(jobPath)?JSON.parse(fs.readFileSync(jobPath)):null;
 if(previous&&previous.fingerprint!==id)throw Error('VERSION_CONFLICT: use a separately reviewed new version');
 const job=previous||{bookId:input.book.bookId,version:input.book.version,fingerprint:id,tag:input.tag,events:[],verified:{}};
 const event=(status,extra={})=>{job.status=status;job.updatedAt=new Date().toISOString();job.events.push({at:job.updatedAt,status,...extra});atomic(jobPath,job);};
 const catalogPath=path.join(root,'data/books.json');mergeBook(JSON.parse(fs.readFileSync(catalogPath)),input);
 const find=()=>{if(job.releaseId)return JSON.parse(gh(['api',`repos/${input.repository}/releases/${job.releaseId}`]));return JSON.parse(gh(['api',`repos/${input.repository}/releases`,'--paginate','--slurp','-H','Cache-Control: no-cache'])).flat().find(r=>r.tag_name===input.tag);};
 let uploads=0,reused=0,publicChecked=0;
 try{
  event('sources_verified',{audio:input.files.length,rightsBasis:input.rightsBasis});let release=find();
  if(!release){const request=path.join(jobs,input.book.bookId+'-release-request.json');atomic(request,{tag_name:input.tag,draft:true,name:input.book.title,body:`Original unmodified chapter M4A. AI-generated text/audio; numbers and English terminology need human review.\n\n${input.rightsBasis}\n\n${input.files.map(a=>a.file+' SHA-256 '+a.sha256+' ('+a.bytes+' bytes)').join('\n\n')}`});release=JSON.parse(gh(['api',`repos/${input.repository}/releases`,'--method','POST','--input',request]));}
  job.releaseId=release.id;
  event('uploading',{releaseId:release.id});
  for(const a of input.files){const old=release.assets.find(r=>r.name===a.file);if(old){if(old.size!==a.bytes||old.digest!=='sha256:'+a.sha256||old.state!=='uploaded')throw Error('REMOTE_CONFLICT: asset is never overwritten');reused++;continue;}
   if(!release.draft&&!input.allowPublishedAppend)throw Error('PUBLISHED_RELEASE: append requires explicit migration review');
   const endpoint=release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(a.file);gh(['api',endpoint,'--method','POST','-H','Content-Type: audio/mp4','--input',path.join(dir,a.file)]);uploads++;event('uploading',{uploaded:a.chapterId,uploads});
   if(uploads>=stopAfterUploads)throw Error('INTERRUPTED_TEST: checkpoint saved; rerun resumes existing assets');
  }
  release=find();for(const a of input.files){const remote=release.assets.find(r=>r.name===a.file);if(!remote||remote.state!=='uploaded'||remote.size!==a.bytes||remote.digest!=='sha256:'+a.sha256)throw Error('UPLOAD_UNVERIFIED: catalog unchanged');}
  event('upload_verified');if(stageOnly){event('draft_ready_awaiting_cover',{uploads,reused});return {bookId:input.book.bookId,tag:input.tag,uploads,reused,status:job.status,published:false};}
  if(release.draft)release=JSON.parse(gh(['api',`repos/${input.repository}/releases/${release.id}`,'--method','PATCH','-F','draft=false']));
  if(release.draft||release.tag_name!==input.tag)throw Error('PUBLICATION_UNCONFIRMED: catalog unchanged');
  for(const ch of input.book.chapters){const a=release.assets.find(r=>r.name===path.posix.basename(new URL(ch.audioUrl).pathname)),old=job.verified[ch.chapterId];
   if(old?.assetId===a.id&&old.sha256===ch.sha256&&old.updatedAt===a.updated_at)continue;
   const response=await fetch(ch.audioUrl,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw Error('PUBLIC_UNAVAILABLE: '+response.status);const b=Buffer.from(await response.arrayBuffer());if(b.length!==ch.bytes||hash(b)!==ch.sha256)throw Error('PUBLIC_HASH_MISMATCH: catalog unchanged');
   job.verified[ch.chapterId]={assetId:a.id,sha256:ch.sha256,bytes:b.length,updatedAt:a.updated_at,checkedAt:new Date().toISOString(),url:ch.audioUrl};publicChecked++;event('public_verifying',{chapterId:ch.chapterId});
  }
  // Reread under a process lease; reject concurrent catalog edits instead of losing them.
  const merged=mergeBook(JSON.parse(fs.readFileSync(catalogPath)),input);validate(merged.catalog,config);if(merged.added||merged.updated)atomic(catalogPath,merged.catalog);
  event('catalog_ready',{releaseUrl:release.html_url,uploads,reused,...{added:merged.added,updated:merged.updated}});
  return {bookId:input.book.bookId,tag:input.tag,uploads,reused,publicChecked,booksAdded:merged.added,booksUpdated:merged.updated,status:job.status};
 }catch(e){event(e.message.startsWith('INTERRUPTED_TEST')?'interrupted':'blocked',{reason:e.message});throw e;}
}
