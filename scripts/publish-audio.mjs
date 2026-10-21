import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,load,validate,hash} from './catalog.mjs';
const gh=(args)=>execFileSync('gh',args,{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
const manifestPath=path.resolve(process.argv[2]||'incoming/publish.json');
const input=JSON.parse(fs.readFileSync(manifestPath,'utf8')), config=load('data/site.json');
if(input.repository!==config.repository||input.repository==='guizhan21/daily-audio-library'||input.rightsReviewed!==true||!input.rightsBasis||!/^audio-[\w.-]+$/.test(input.tag))throw Error('Wrong target or missing public-sharing review');
validate({schemaVersion:1,books:[input.book]},config);
const repository=JSON.parse(gh(['repo','view',input.repository,'--json','visibility,nameWithOwner']));
if(repository.visibility!=='PUBLIC'||repository.nameWithOwner!==input.repository)throw Error('Dedicated PUBLIC test repository required');
for(const asset of input.files){
  if(path.basename(asset.file)!==asset.file||!/^.+\.(m4a|aac)$/.test(asset.file))throw Error('Invalid filename');
  const file=path.join(path.dirname(manifestPath),asset.file),data=fs.readFileSync(file);
  const chapter=input.book.chapters.find(ch=>ch.chapterId===asset.chapterId);
  if(!chapter||chapter.sha256!==asset.sha256||chapter.bytes!==data.length||hash(data)!==asset.sha256||!chapter.audioUrl.endsWith(`/${input.tag}/${asset.file}`))throw Error('Source manifest mismatch');
}
if(input.files.length!==input.book.chapters.length)throw Error('Incomplete audio batch');
const findRelease=()=>JSON.parse(gh(['api',`repos/${input.repository}/releases?per_page=100`,'--paginate','--slurp'])).flat().find(r=>r.tag_name===input.tag);
let release=findRelease();
if(!release){
  const notes=path.join(root,'.tmp/release-notes.md');fs.mkdirSync(path.dirname(notes),{recursive:true});
  fs.writeFileSync(notes,`# ${input.book.title} — two-chapter public streaming experiment\n\nOriginal, unmodified NotebookLM M4A. Text and Image cover are AI-generated. Numbers and English terminology still require human review.\n\n${input.rightsBasis}\n\nSHA-256:\n${input.files.map(a=>`- ${a.file}: ${a.sha256} (${a.bytes} bytes)`).join('\n')}\n`);
  gh(['release','create',input.tag,'--repo',input.repository,'--draft','--title',input.book.title+' · 原音訊測試','--notes-file',notes]);
  release=findRelease();if(!release)throw Error('Draft creation not confirmed');
}
let uploads=0;
for(const asset of input.files){
  const old=release.assets.find(a=>a.name===asset.file);
  if(old){if(old.size!==asset.bytes||old.digest!==`sha256:${asset.sha256}`)throw Error('Existing asset differs; will not overwrite');continue;}
  if(!release.draft)throw Error('Published release is immutable to this uploader; use a new version');
  gh(['release','upload',input.tag,path.join(path.dirname(manifestPath),asset.file),'--repo',input.repository]);uploads++;
}
release=findRelease();
for(const asset of input.files){const remote=release.assets.find(a=>a.name===asset.file);if(!remote||remote.state!=='uploaded'||remote.size!==asset.bytes||remote.digest!==`sha256:${asset.sha256}`)throw Error('Upload not verified; leave draft and do not publish catalog');}
if(release.draft)gh(['release','edit',input.tag,'--repo',input.repository,'--draft=false']);
// Full public byte verification occurs before any book enters the catalog.
for(const chapter of input.book.chapters){const response=await fetch(chapter.audioUrl);if(!response.ok)throw Error(`Public Release unavailable: ${response.status}`);const buffer=Buffer.from(await response.arrayBuffer());if(buffer.length!==chapter.bytes||hash(buffer)!==chapter.sha256)throw Error('Public bytes differ; catalog not updated');}
const catalog=load('data/books.json');const old=catalog.books.find(b=>b.bookId===input.book.bookId);
if(old&&JSON.stringify(old)!==JSON.stringify(input.book))throw Error('Existing book differs; explicit version review required');
if(!old)catalog.books.push(input.book);
validate(catalog,config);
const target=path.join(root,'data/books.json'),tmp=target+'.tmp';fs.writeFileSync(tmp,JSON.stringify(catalog,null,2)+'\n');fs.renameSync(tmp,target);
console.log(JSON.stringify({published:true,tag:input.tag,uploads,existingAssetsReused:input.files.length-uploads,booksAdded:old?0:1,fullPublicSHA256:true}));
