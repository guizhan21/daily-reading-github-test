import test from 'node:test';import assert from 'node:assert/strict';
import {assertPublicationSourceReference} from '../scripts/publication-sources.mjs';
const canonical={binding:{sourceVersionId:'canonical'}},working={manifest:{versionId:'reviewed'},manifestPath:'reviewed/manifest.json',manifestSha256:'a'.repeat(64)};
test('one book can publish unchanged and reviewed chapters together',()=>{
 for(const [context,ref] of [[canonical,{manifestPath:null,manifestSha256:null}],[working,{manifestPath:working.manifestPath,manifestSha256:working.manifestSha256}]])assert.doesNotThrow(()=>assertPublicationSourceReference(context,ref));
});
test('canonical reference is explicit rather than silently missing',()=>{for(const ref of [undefined,{}, {manifestPath:null},{manifestSha256:null}])assert.throws(()=>assertPublicationSourceReference(canonical,ref),/reference changed/);});
test('active corrected source cannot be downgraded to canonical',()=>assert.throws(()=>assertPublicationSourceReference(working,{manifestPath:null,manifestSha256:null}),/reference changed/));
test('canonical source cannot acquire a self-declared corrected manifest',()=>assert.throws(()=>assertPublicationSourceReference(canonical,{manifestPath:working.manifestPath,manifestSha256:working.manifestSha256}),/reference changed/));
test('another reviewed source hash is rejected',()=>assert.throws(()=>assertPublicationSourceReference(working,{manifestPath:working.manifestPath,manifestSha256:'b'.repeat(64)}),/reference changed/));
test('another reviewed source path is rejected',()=>assert.throws(()=>assertPublicationSourceReference(working,{manifestPath:'other/manifest.json',manifestSha256:working.manifestSha256}),/reference changed/));
