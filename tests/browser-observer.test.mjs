import {test} from 'node:test';import assert from 'node:assert/strict';import {navigationImageCancellation} from './browser-observer.mjs';
const url='https://example.test/books/covers/original.png',text='[JavaScript Error: "Image corrupt or truncated." {file: "'+url+'" line: 0}]';
const make=()=>({error:{type:'console',pageId:1,at:1002,text},context:{browser:'firefox',knownCovers:new Set([url]),failures:[{pageId:1,url,startedAt:100,at:1000,reason:'NS_BINDING_ABORTED'}],navigations:[{pageId:1,at:980}]}});
const classified=({error,context})=>navigationImageCancellation(error,context);
test('correlated native navigation cancellation is preserved with proof',()=>assert.equal(classified(make()).abortedAt,1000));
test('a corrupt image with no aborted request remains an error',()=>{const x=make();x.context.failures=[];assert.equal(classified(x),null);});
test('no navigation means no exception',()=>{const x=make();x.context.navigations=[];assert.equal(classified(x),null);});
test('another page cannot explain this error',()=>{const x=make();x.context.failures[0].pageId=2;assert.equal(classified(x),null);});
test('an old aborted request cannot mask a new error',()=>{const x=make();x.context.failures[0].at=500;assert.equal(classified(x),null);});
test('only catalogued cover URLs qualify',()=>{const x=make();x.context.knownCovers.clear();assert.equal(classified(x),null);});
test('network truncation is fatal even near navigation',()=>{const x=make();x.context.failures[0].reason='NS_ERROR_NET_PARTIAL_TRANSFER';assert.equal(classified(x),null);});

test('generic NS_ERROR_ABORT remains fatal even with nearby navigation',()=>{const x=make();x.context.failures[0].reason='NS_ERROR_ABORT';assert.equal(classified(x),null);});
test('requests started after navigation cannot be attributed to it',()=>{const x=make();x.context.failures[0].startedAt=990;assert.equal(classified(x),null);});
test('another navigation page cannot explain the cancellation',()=>{const x=make();x.context.navigations[0].pageId=2;assert.equal(classified(x),null);});
test('Chrome errors are not suppressed',()=>{const x=make();x.context.browser='chrome';assert.equal(classified(x),null);});
test('JavaScript exceptions remain fatal',()=>{const x=make();x.error.type='pageerror';assert.equal(classified(x),null);});
test('ordinary console errors with a similar phrase remain fatal',()=>{const x=make();x.error.text='Image corrupt or truncated.';assert.equal(classified(x),null);});
