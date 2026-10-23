import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,hash} from '../scripts/catalog.mjs';
import {readReviewedSource} from '../scripts/reviewed-intake.mjs';

async function fixture(run){
 const temp=path.join(root,'.tmp');fs.mkdirSync(temp,{recursive:true});
 const dir=fs.mkdtempSync(path.join(temp,'review-source-'));
 const raw=Buffer.from('original unmodified package'),compatible=Buffer.from('reviewed compatibility fixture'),normalized=Buffer.from('normalized fixture');
 const job={id:'fixture',result:{sha256:hash(raw)}};
 const parsed={manifest:{id:'original-id'},chapters:[{id:'original-chapter',markdown:'Original body',prompt:'Original prompt'}]};
 const review={schema:1,downloadJobId:job.id,bookId:parsed.manifest.id,originalSha256:hash(raw),downstreamAuthorized:true,modelGate:'removed_by_user',userAuthorization:'Explicit user approval recorded for the original source.',receivedDate:'2026-10-23',excludedFromCompatibilityOnly:[{file:'quality_report.json'}],chaptersUnchanged:true,promptsUnchanged:true,metadataIdentityUnchanged:true,compatiblePath:path.join(dir,'compat.zip'),compatibleSha256:hash(compatible),normalizedPath:path.join(dir,'normalized.zip'),normalizedSha256:hash(normalized),allListedChecksumsVerifiedByOriginalImporter:20,bindings:parsed.chapters.map(c=>({chapterId:c.id,sourceSha256:hash(c.markdown),promptSha256:hash(c.prompt)}))};
 fs.writeFileSync(review.compatiblePath,compatible);fs.writeFileSync(review.normalizedPath,normalized);
 const reviewFile=path.join(dir,'review.json');
 let calls=0;
 const prepare=async(file,digest)=>{calls++;assert.equal(file,review.compatiblePath);assert.equal(digest,hash(compatible));return{buffer:normalized,report:{checksumsVerified:20}};};
 const invoke=async()=>{fs.writeFileSync(reviewFile,JSON.stringify(review));return readReviewedSource(root,job,raw,reviewFile,prepare,async()=>parsed);};
 try{await run({review,parsed,job,invoke,normalized,get calls(){return calls;}});}finally{
  if(path.dirname(dir)!==temp||fs.lstatSync(dir).isSymbolicLink())throw Error('Unsafe fixture cleanup');
  fs.rmSync(dir,{recursive:true});
 }
}
test('reviewed auxiliary exception still runs the strict converter and preserves source digest',()=>fixture(async f=>{const p=await f.invoke();assert.equal(f.calls,1);assert.deepEqual(p.buffer,f.normalized);assert.equal(p.report.originalSourceSha256,f.job.result.sha256);assert.equal(p.review.bookId,'original-id');}));
test('unapproved compatibility input is rejected before conversion',()=>fixture(async f=>{f.review.downstreamAuthorized=false;await assert.rejects(f.invoke(),/AUTHORIZATION/);assert.equal(f.calls,0);}));
test('changed raw download cannot reuse a previous source review',()=>fixture(async f=>{f.job.result.sha256='0'.repeat(64);await assert.rejects(f.invoke(),/SOURCE_CHANGED/);assert.equal(f.calls,0);}));
test('modified compatibility archive is rejected before import',()=>fixture(async f=>{fs.appendFileSync(f.review.compatiblePath,'changed');await assert.rejects(f.invoke(),/ARCHIVE_CHANGED/);assert.equal(f.calls,0);}));
test('source body or prompt changes cannot pass an auxiliary packaging review',()=>fixture(async f=>{f.parsed.chapters[0].markdown='Altered body';await assert.rejects(f.invoke(),/BODY_CHANGED/);f.parsed.chapters[0].markdown='Original body';f.parsed.chapters[0].prompt='Altered prompt';await assert.rejects(f.invoke(),/BODY_CHANGED/);}));
test('chapter identity collisions and unrelated exclusions are rejected',()=>fixture(async f=>{f.review.bindings.push({...f.review.bindings[0]});await assert.rejects(f.invoke(),/IDENTITY_CHANGED/);f.review.bindings.pop();f.review.excludedFromCompatibilityOnly=[{file:'chapter.md'}];await assert.rejects(f.invoke(),/PROFILE_UNSUPPORTED/);}));
