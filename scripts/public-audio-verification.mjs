import {createHash} from 'node:crypto';

// A slow, progressing download is not a stalled transfer. Keep a bounded idle
// deadline while checking every original byte; never persist a signed redirect.
export async function verifyPublicAudio(chapter,{fetcher=fetch,idleTimeoutMs=90000,onProgress=()=>{}}={}){
 const controller=new AbortController();let timer,bytes=0,lastProgress=0;
 const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(new DOMException('Public audio transfer made no progress','TimeoutError')),idleTimeoutMs);};
 arm();
 try{
  const response=await fetcher(chapter.audioUrl,{signal:controller.signal});
  if(!response.ok)throw Error('PUBLIC_UNAVAILABLE: '+response.status);
  if(!response.body)throw Error('PUBLIC_UNAVAILABLE: empty response body');
  arm();const hash=createHash('sha256');onProgress(0);
  for await(const chunk of response.body){
   if(controller.signal.aborted)throw controller.signal.reason;
   bytes+=chunk.length;if(bytes>chapter.bytes)throw Error('PUBLIC_HASH_MISMATCH: response exceeds original size');
   hash.update(chunk);arm();
   if(Date.now()-lastProgress>=5000){onProgress(bytes);lastProgress=Date.now();}
  }
  if(controller.signal.aborted)throw controller.signal.reason;
  const sha256=hash.digest('hex');
  if(bytes!==chapter.bytes||sha256!==chapter.sha256)throw Error('PUBLIC_HASH_MISMATCH: catalog unchanged');
  onProgress(bytes);return {bytes,sha256};
 }finally{clearTimeout(timer);controller.abort();}
}
