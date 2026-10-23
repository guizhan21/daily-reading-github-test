// Hash-bound review of one auxiliary-file packaging defect, using the strict converter.
import fs from 'node:fs';import path from 'node:path';
import {hash} from './catalog.mjs';import {inside} from './local-paths.mjs';
export async function readReviewedSource(workspace,job,raw,reviewFile,prepareBook,parseArchive){
 const review=JSON.parse(fs.readFileSync(inside(workspace,reviewFile)));
 if(review.schema!==1||review.downloadJobId!==job.id||review.originalSha256!==hash(raw)||review.originalSha256!==job.result.sha256)throw Error('REVIEW_SOURCE_CHANGED');
 if(review.downstreamAuthorized!==true||review.modelGate!=='removed_by_user'||typeof review.userAuthorization!=='string'||review.userAuthorization.length<10)throw Error('REVIEW_AUTHORIZATION_REQUIRED');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(review.receivedDate||'')||review.excludedFromCompatibilityOnly?.length!==1||review.excludedFromCompatibilityOnly[0].file!=='quality_report.json'||!review.chaptersUnchanged||!review.promptsUnchanged||!review.metadataIdentityUnchanged)throw Error('REVIEW_PROFILE_UNSUPPORTED');
 const compatibility=inside(workspace,review.compatiblePath),normalized=inside(workspace,review.normalizedPath);
 if(hash(fs.readFileSync(compatibility))!==review.compatibleSha256||hash(fs.readFileSync(normalized))!==review.normalizedSha256)throw Error('REVIEW_ARCHIVE_CHANGED');
 const prepared=await prepareBook(compatibility,review.compatibleSha256);
 if(hash(prepared.buffer)!==review.normalizedSha256||prepared.report.checksumsVerified!==review.allListedChecksumsVerifiedByOriginalImporter)throw Error('REVIEW_CONVERSION_CHANGED');
 const parsed=await parseArchive(prepared.buffer),bindings=review.bindings;
 if(parsed.manifest.id!==review.bookId||!Array.isArray(bindings)||parsed.chapters.length!==bindings.length||new Set(bindings.map(c=>c.chapterId)).size!==bindings.length)throw Error('REVIEW_IDENTITY_CHANGED');
 for(const ch of parsed.chapters){const b=bindings.find(b=>b.chapterId===ch.id);if(!b||hash(ch.markdown)!==b.sourceSha256||hash(ch.prompt)!==b.promptSha256)throw Error('REVIEW_BODY_CHANGED');}
 return {...prepared,review,report:{...prepared.report,originalSourceSha256:hash(raw),reviewFile:path.relative(workspace,inside(workspace,reviewFile)).replaceAll('\\','/'),reviewedAuxiliaryException:true}};
}
