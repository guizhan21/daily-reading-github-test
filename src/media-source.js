// The catalog keeps permanent canonical Release URLs. Only bounded transport
// retries receive an ephemeral cache key; it is never saved in book/progress data.
const noncePattern=/^[a-z0-9-]{1,80}$/;
export function retryAudioURL(original,attempt,nonce){
 if(attempt===0)return original;
 if(![1,2].includes(attempt)||!noncePattern.test(String(nonce)))throw new Error('Invalid bounded audio retry');
 const url=new URL(original);if(url.protocol!=='https:'||url.searchParams.has('dr_retry'))throw new Error('Invalid audio source');
 url.searchParams.set('dr_retry',attempt+'-'+nonce);return url.href;
}
export function canonicalAudioURL(actual){
 try{const url=new URL(actual);if(url.protocol!=='https:')return '';const value=url.searchParams.get('dr_retry');if(value&&/^[12]-[a-z0-9-]{1,80}$/.test(value))url.searchParams.delete('dr_retry');return url.href;}catch{return '';}
}
