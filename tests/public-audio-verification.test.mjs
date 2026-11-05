import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {verifyPublicAudio} from '../scripts/public-audio-verification.mjs';
const original=Buffer.from('original chapter audio bytes');
const chapter={audioUrl:'https://github.com/example/library/releases/download/audio-v1/ch01.m4a',bytes:original.length,sha256:createHash('sha256').update(original).digest('hex')};
function source(chunks,{gap=0,stall=false}={}){
 return async(_url,{signal})=>new Response(new ReadableStream({
  async start(controller){
   const abort=()=>controller.error(signal.reason);signal.addEventListener('abort',abort,{once:true});
   try{for(const chunk of chunks){if(gap)await delay(gap);if(signal.aborted)return;controller.enqueue(chunk);}if(!stall){signal.removeEventListener('abort',abort);controller.close();}}
   catch(error){controller.error(error);}
  }
 }),{status:200});
}
test('a progressing original can take longer than the idle deadline without losing full SHA verification',async()=>{
 const chunks=[original.subarray(0,8),original.subarray(8,16),original.subarray(16)],progress=[],start=Date.now();
 const result=await verifyPublicAudio(chapter,{fetcher:source(chunks,{gap:50}),idleTimeoutMs:120,onProgress:n=>progress.push(n)});
 assert.ok(Date.now()-start>=150);assert.deepEqual(result,{bytes:chapter.bytes,sha256:chapter.sha256});assert.equal(progress.at(-1),chapter.bytes);
});
test('a transfer that stops producing bytes remains a timeout, never verified',async()=>{
 await assert.rejects(verifyPublicAudio(chapter,{fetcher:source([original.subarray(0,5)],{stall:true}),idleTimeoutMs:30}),{name:'TimeoutError'});
});
test('truncated and same-size corrupted public bytes are rejected',async()=>{
 await assert.rejects(verifyPublicAudio(chapter,{fetcher:source([original.subarray(1)])}),/PUBLIC_HASH_MISMATCH/);
 const corrupt=Buffer.from(original);corrupt[0]^=1;
 await assert.rejects(verifyPublicAudio(chapter,{fetcher:source([corrupt])}),/PUBLIC_HASH_MISMATCH/);
});
test('an oversized or HTTP error response cannot be accepted as original audio',async()=>{
 await assert.rejects(verifyPublicAudio(chapter,{fetcher:source([Buffer.concat([original,Buffer.from('extra')])])}),/exceeds original size/);
 await assert.rejects(verifyPublicAudio(chapter,{fetcher:async()=>new Response('login',{status:403})}),/PUBLIC_UNAVAILABLE: 403/);
});
