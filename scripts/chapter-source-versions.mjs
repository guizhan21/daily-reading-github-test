// Canonical manuscripts remain immutable. Working versions are separate, reviewed inputs.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {inside,lease} from './local-paths.mjs';import {DedupStore,durable,digest} from './dedup.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file));
const base='storage/github-publishing/working-versions';
const pointerFile=workspace=>inside(workspace,base+'/active.json');
export function activeVersions(workspace){const file=pointerFile(workspace);const p=fs.existsSync(file)?read(file):{schema:1,revision:0,chapters:{}};if(p.schema!==1||!Number.isSafeInteger(p.revision)||!p.chapters||typeof p.chapters!=='object')throw Error('SOURCE_VERSION_POINTER_INVALID');return p;}
export function providerActionPolicy(workspace,chapterId){const file=inside(workspace,'storage/github-publishing/operation-policy.json');if(!fs.existsSync(file))return {allowed:true};const p=read(file);if(p.schema!==1||!Array.isArray(p.chapterIds)||typeof p.providerActionsAllowed!=='boolean')throw Error('PROVIDER_POLICY_INVALID');return p.chapterIds.includes(chapterId)?{allowed:p.providerActionsAllowed,reason:p.reason,sha256:hash(fs.readFileSync(file))}:{allowed:true};}
export function assertProviderActionAllowed(workspace,chapterId){const policy=providerActionPolicy(workspace,chapterId);if(!policy.allowed)throw Error('PROVIDER_ACTION_BLOCKED: '+policy.reason);}
export function canonicalSource(workspace,chapter,state){
 if(chapter.id!==state.chapterId||chapter.book_id!==state.bookId||hash(chapter.markdown+'\0'+chapter.prompt)!==chapter.content_hash||state.contentHash!==chapter.content_hash||state.sourceSha256!==hash(chapter.markdown)||state.promptSha256!==hash(chapter.prompt))throw Error('CANONICAL_SOURCE_CHANGED');
 if(hash(fs.readFileSync(inside(workspace,state.sourcePath)))!==state.sourceSha256||hash(fs.readFileSync(inside(workspace,state.promptPath)))!==state.promptSha256)throw Error('CANONICAL_SOURCE_BYTES_CHANGED');
 return true;
}
export function validateExactWorkingEdits(original,working,edits,kind){
 if(!Array.isArray(edits)||(!edits.length&&kind!=='chapter_review_update')||(kind==='chapter_review_update'&&(edits.length||original!==working)))throw Error('WORKING_VERSION_EXACT_EDITS_REQUIRED');let text=original;
 for(const e of edits){if(!e.before||typeof e.after!=='string'||!e.reason||text.split(e.before).length!==2)throw Error('WORKING_VERSION_EDIT_MISMATCH');text=text.replace(e.before,e.after);}
 if(text!==working)throw Error('WORKING_VERSION_UNREVIEWED_DIFF');return true;
}
export function inspectVersion(workspace,chapter,state,manifestPath){
 canonicalSource(workspace,chapter,state);const file=inside(workspace,manifestPath),bytes=fs.readFileSync(file),m=JSON.parse(bytes);
 if(m.schema!==1||!['chapter_source_correction','chapter_review_update'].includes(m.kind)||m.bookId!==chapter.book_id||m.chapterId!==chapter.id||m.canonicalContentHash!==chapter.content_hash||m.originalSourceSha256!==state.sourceSha256||m.originalPromptSha256!==state.promptSha256)throw Error('WORKING_VERSION_IDENTITY_CHANGED');
 const sourceFile=inside(workspace,m.sourcePath),dir=path.dirname(file);
 if(path.dirname(sourceFile)!==dir||!path.relative(inside(workspace,base+'/versions'),dir)||path.relative(inside(workspace,base+'/versions'),dir).startsWith('..'))throw Error('WORKING_VERSION_PATH_INVALID');
 const source=fs.readFileSync(sourceFile),factsFile=inside(workspace,m.factsPath),webFile=inside(workspace,m.webReviewPath);
 if(path.dirname(factsFile)!==dir||path.dirname(webFile)!==dir||hash(source)!==m.sourceSha256||hash(fs.readFileSync(factsFile))!==m.constraintsSha256||hash(fs.readFileSync(webFile))!==m.webReviewSha256)throw Error('WORKING_VERSION_BYTES_CHANGED');
 validateExactWorkingEdits(chapter.markdown,source.toString('utf8'),m.edits,m.kind);
 if(m.versionId!=='work-'+m.sourceSha256.slice(0,16)+'-'+digest([m.constraintsSha256,m.webReviewSha256,m.originalPromptSha256]).slice(0,12))throw Error('WORKING_VERSION_KEY_CHANGED');
 const compiled=inside(workspace,m.compiledPromptPath);if(path.dirname(compiled)!==dir||hash(fs.readFileSync(compiled))!==m.compiledPromptSha256||!fs.readFileSync(compiled,'utf8').includes(chapter.prompt))throw Error('WORKING_FULL_PROMPT_CHANGED');
 return {manifest:m,manifestPath:path.relative(workspace,file),manifestSha256:hash(bytes),directory:dir,source:source.toString('utf8')};
}
function versionAdmission(workspace,found,chapter){const store=new DedupStore(workspace);if(found.manifest.kind==='chapter_review_update'){const entry=store.load().entries.find(e=>e.bookId===chapter.book_id);if(!entry||entry.chapters.find(c=>c.chapterId===chapter.id)?.rawSha256!==found.manifest.sourceSha256)throw Error('CANONICAL_REVIEW_SOURCE_CHANGED');store.assert(entry);return {reviewSha256:entry.reviewSha256??null};}return store.assertWorkingVersion(found.manifestSha256,chapter.book_id,chapter.id);}
export function resolveChapterSource(workspace,chapter,state){
 const pointer=activeVersions(workspace).chapters[chapter.id];
 if(!pointer)return {chapter,state,directory:path.dirname(inside(workspace,state.sourcePath)),binding:{sourceVersionId:'canonical',sourceSha256:state.sourceSha256,originalPromptSha256:state.promptSha256,canonicalContentHash:chapter.content_hash,workingManifestSha256:null}};
 const found=inspectVersion(workspace,chapter,state,pointer.manifestPath);
 if(found.manifestSha256!==pointer.manifestSha256||found.manifest.versionId!==pointer.versionId)throw Error('ACTIVE_WORKING_VERSION_CHANGED');
 const admission=versionAdmission(workspace,found,chapter);
 // Source identity is immutable. A refreshed current admission receipt must not orphan an existing artifact.
 const binding={sourceVersionId:found.manifest.versionId,sourceSha256:found.manifest.sourceSha256,originalPromptSha256:state.promptSha256,canonicalContentHash:chapter.content_hash,workingManifestSha256:found.manifestSha256};
 if((state.notebookId||state.sourceId||state.artifactId||state.generationSubmissionCount||state.events.some(e=>e.status==='generating'))&&JSON.stringify(state.sourceVersionBinding)!==JSON.stringify(binding))throw Error('PROVIDER_SOURCE_VERSION_MISMATCH');
 return {...found,chapter:{...chapter,markdown:found.source},state:{...state,sourcePath:found.manifest.sourcePath,sourceSha256:found.manifest.sourceSha256},binding,admissionReceipt:{reviewSha256:admission.reviewSha256,reviewedAtRevision:admission.reviewedAtRevision??null}};
}
export function activateVersion(workspace,chapter,state,manifestPath,expectedRevision){
 if(state.status!=='pending'||state.notebookId||state.sourceId||state.artifactId||state.generationSubmissionCount||state.events.some(e=>e.status==='generating'))throw Error('WORKING_VERSION_PROVIDER_WORK_EXISTS');
 const releaseIntake=lease(workspace,'github-intake');let release=null;try{
  release=lease(workspace,'github-source-versions');
  const freshFile=inside(workspace,path.join('storage/github-publishing/notebooklm',chapter.id,chapter.content_hash.slice(0,16),'state.json')),fresh=read(freshFile);
  if(fresh.status!=='pending'||fresh.notebookId||fresh.sourceId||fresh.artifactId||fresh.generationSubmissionCount||fresh.events.some(e=>e.status==='generating'))throw Error('WORKING_VERSION_PROVIDER_WORK_EXISTS');state=fresh;
  const before=activeVersions(workspace);if(before.revision!==expectedRevision)throw Error('WORKING_VERSION_CAS_CONFLICT');
  const found=inspectVersion(workspace,chapter,state,manifestPath);versionAdmission(workspace,found,chapter);
  const previous=before.chapters[chapter.id];if(previous?.manifestSha256===found.manifestSha256)return {duplicate:true,...before};
  const next={schema:1,revision:before.revision+1,chapters:{...before.chapters,[chapter.id]:{versionId:found.manifest.versionId,manifestPath:found.manifestPath,manifestSha256:found.manifestSha256}}};
  const history=inside(workspace,base+'/history/'+before.revision+'.json');if(fs.existsSync(history)){if(digest(read(history))!==digest(before))throw Error('WORKING_VERSION_HISTORY_CONFLICT');}else durable(history,before);
  durable(pointerFile(workspace),next);return next;
 }finally{release?.();releaseIntake();}
}
