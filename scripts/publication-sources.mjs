// Direct publisher preflight: the manifest cannot self-certify corrected source text.
import fs from 'node:fs';import path from 'node:path';
import {inside} from './local-paths.mjs';import {resolveChapterSource,assertProviderActionAllowed,activeVersions} from './chapter-source-versions.mjs';
import {loadWebReview,requirePreverifiedArtifact,sha} from './audio-facts.mjs';
export function validatePublicationSources(site,input){
 const workspace=fs.realpathSync(input.dedupWorkspace||site);inside(workspace,site);
 const active=activeVersions(workspace);if(!input.sourceVersions){if(input.book.chapters.some(c=>active.chapters[c.chapterId]))throw Error('Publication working source manifest map required');return null;}
 const catalog=JSON.parse(fs.readFileSync(inside(workspace,input.sourceCatalog||'storage/github-publishing/source-catalog.json'))).tables;
 const expected=catalog.chapters.filter(c=>c.book_id===input.book.bookId),versions=input.sourceVersions;if(!expected.length||Object.keys(versions).length!==expected.length||expected.some(c=>!versions[c.id]||typeof versions[c.id].manifestPath!=='string'||typeof versions[c.id].manifestSha256!=='string'))throw Error('Publication source version map incomplete');
 const verified=new Map();for(const ch of expected){
  assertProviderActionAllowed(workspace,ch.id);const state=JSON.parse(fs.readFileSync(inside(workspace,path.join(input.sourceStateRoot||'storage/github-publishing/notebooklm',ch.id,ch.content_hash.slice(0,16),'state.json'))));
  const context=resolveChapterSource(workspace,ch,state),ref=versions[ch.id],pub=input.book.chapters.find(c=>c.chapterId===ch.id),asset=catalog.audio_assets.find(a=>a.chapter_id===ch.id&&a.content_hash===ch.content_hash);
  if(!context.manifest||ref.manifestSha256!==context.manifestSha256||ref.manifestPath!==context.manifestPath||pub?.textSha256!==sha(context.chapter.markdown)||state.status!=='playable'||state.audioSha256!==pub.sha256||!asset||JSON.stringify(asset.sourceVersionBinding)!==JSON.stringify(context.binding))throw Error('Publication source/audio binding changed');
  loadWebReview(workspace,ch,state);const proof=JSON.parse(fs.readFileSync(inside(workspace,'storage/github-publishing/evidence/'+ch.id+'-source.json')));requirePreverifiedArtifact(workspace,ch,state,proof);
  verified.set(ch.id,{textSha256:sha(context.chapter.markdown),manifestSha256:context.manifestSha256,sourceVersionBinding:context.binding,originalPromptSha256:sha(ch.prompt),submittedPromptSha256:state.settingsVerified.submittedPromptSha256,artifactId:state.artifactId,audioSha256:state.audioSha256});
 }return verified;
}
