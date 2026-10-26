import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {retryAudioURL} from '../src/media-source.js';

const transient=new Set([429,500,502,503,504]);
async function follow(url,method,headers,fetcher,chain){
 for(let hop=0;hop<8;hop++){
  const response=await fetcher(url,{method,headers,redirect:'manual',signal:AbortSignal.timeout(45000)});
  chain.push({origin:new URL(url).origin,status:response.status});
  if(![301,302,303,307,308].includes(response.status))return response;
  const location=response.headers.get('location');
  if(!location)throw Error('Missing redirect Location');
  const next=new URL(location,url);
  if(next.protocol!=='https:')throw Error('Unsafe redirect');
  await response.body?.cancel();url=next.href;
 }
 throw Error('Redirect loop');
}

// The first request is always canonical. Two bounded transport retries use the
// player's existing cache key for the same asset, never a persisted signed URL.
export async function probeRequest(original,method,headers={},options={}){
 const {fetcher=fetch,sleep=delay,nonce=()=>Date.now().toString(36)+'-'+randomUUID().slice(0,8)}=options;
 const attempts=[];
 for(let attempt=0;attempt<3;attempt++){
  const chain=[],entry={attempt,chain};attempts.push(entry);
  try{
   const response=await follow(retryAudioURL(original,attempt,attempt?nonce():''),method,headers,fetcher,chain);
   entry.status=response.status;
   if(!transient.has(response.status)||attempt===2)return {response,chain,attempts};
   const retryAfter=response.headers.get('retry-after');
   let pause=(attempt+1)*1000;
   if(retryAfter){const seconds=/^\d+$/.test(retryAfter)?Number(retryAfter):Math.ceil((Date.parse(retryAfter)-Date.now())/1000);if(!Number.isFinite(seconds)||seconds>30)return {response,chain,attempts};pause=Math.max(pause,seconds*1000);}
   await response.body?.cancel();await sleep(pause);
  }catch(error){
   // Do not store network error messages that may contain redirected signatures.
   entry.error={name:error.name,code:error.cause?.code||error.code||null};
   if(!['TimeoutError','AbortError','TypeError'].includes(error.name)||attempt===2){error.probeAttempts=attempts;throw error;}
   await sleep((attempt+1)*1000);
  }
 }
 throw Error('Bounded probe exhausted');
}
