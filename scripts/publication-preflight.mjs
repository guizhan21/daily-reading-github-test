// Read-only local publication validation. This module never calls gh/fetch or updates a catalog.
import fs from 'node:fs';import path from 'node:path';
import {inside} from './local-paths.mjs';import {hash} from './catalog.mjs';
import {publicationAdmission} from './dedup.mjs';import {validatePublicationSources} from './publication-sources.mjs';
export function publicationPreflight(input,{root,dir,config,sourceCheck,materialization=null}){
 sourceCheck(input,dir,config);
 const verifiedSources=validatePublicationSources(root,input),admission=publicationAdmission(root,input,verifiedSources);
 const workspace=fs.realpathSync(input.dedupWorkspace||root);inside(workspace,root);inside(workspace,dir);
 const approval=materialization?.approval??JSON.parse(fs.readFileSync(inside(workspace,path.join(root,'data/publication-rights.json')))).books.find(r=>r.bookId===input.book.bookId&&r.version===input.book.version);
 if(!approval||approval.bookId!==input.book.bookId||approval.version!==input.book.version||approval.decision!=='approved'||typeof approval.basis!=='string'||approval.basis.length<20||!Array.isArray(approval.chapters)||approval.chapters.length!==input.book.chapters.length||new Set(approval.chapters.map(c=>c.chapterId)).size!==approval.chapters.length)throw Error('RIGHTS: explicit complete hash-bound publication review required');
 for(const ch of input.book.chapters){const reviewed=approval.chapters.find(r=>r.chapterId===ch.chapterId),text=materialization?.texts?.get(ch.chapterId)??fs.readFileSync(inside(workspace,path.join(root,'public',ch.markdown)));
  if(!reviewed||reviewed.audioSha256!==ch.sha256||reviewed.textSha256!==ch.textSha256||hash(text)!==ch.textSha256)throw Error('RIGHTS: chapter version differs');
 }
 const coverFile=inside(workspace,materialization?.coverFile??path.join(root,'public',input.book.cover));if(!fs.existsSync(coverFile)||hash(fs.readFileSync(coverFile))!==approval.coverSha256)throw Error('COVER_HASH: original cover differs or is unavailable');
 return {status:'publication_preflight_passed',preflightOnly:true,publisherRoot:root,bookId:input.book.bookId,chapters:input.book.chapters.length,bookSha256:hash(JSON.stringify(input.book)),sourceVersions:input.sourceVersions??null,sourceBindings:verifiedSources?Object.fromEntries(verifiedSources):null,legacyAdmission:admission.historical===true,rightsVerified:true,networkActions:0,catalogWrites:0,publicationPerformed:false};
}
