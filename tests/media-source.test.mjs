import test from 'node:test';import assert from 'node:assert/strict';import {canonicalAudioURL,retryAudioURL} from '../src/media-source.js';
const original='https://github.com/owner/books/releases/download/book-v1/ch01.m4a';
test('normal loads retain the exact permanent Release URL',()=>assert.equal(retryAudioURL(original,0,''),original));
test('bounded retries use unique fresh requests for the identical Release asset',()=>{const a=retryAudioURL(original,1,'123-1'),b=retryAudioURL(original,2,'123-2');assert.notEqual(a,b);assert.equal(new URL(a).origin,new URL(original).origin);assert.equal(new URL(a).pathname,new URL(original).pathname);assert.equal(canonicalAudioURL(a),original);assert.equal(canonicalAudioURL(b),original);});
test('source identity retains unowned query parameters',()=>assert.notEqual(canonicalAudioURL(original+'?different=1'),original));
test('unrecognized retry values cannot masquerade as a canonical source',()=>assert.notEqual(canonicalAudioURL(original+'?dr_retry=unrecognized'),original));
test('retry normalization never equates another book, host, or chapter',()=>{for(const other of [original.replace('ch01','ch02'),original.replace('book-v1','other-v1'),original.replace('github.com','example.com')])assert.notEqual(canonicalAudioURL(retryAudioURL(other,1,'123')),original);});
test('invalid or empty native sources remain unmatched',()=>{for(const source of ['',undefined,'not a url','http://example.com/ch.m4a'])assert.equal(canonicalAudioURL(source),'');});
test('invalid retry limits and nonce values are rejected',()=>{for(const attempt of [-1,3,99,1.5])assert.throws(()=>retryAudioURL(original,attempt,'123'));assert.throws(()=>retryAudioURL(original,1,'bad value'));assert.throws(()=>retryAudioURL(original+'?dr_retry=1-old',1,'123'));});
