// Audio Session is optional. A system interruption is not a network failure,
// and automatic retries must never try to take audio focus from another app.
export function createAudioSession(platform=globalThis.navigator) {
 let session;
 try{session=platform?.audioSession;}catch{/* Some engines expose an unavailable API. */}
 const interrupted=()=>{try{return session?.state==='interrupted';}catch{return false;}};
 function prepare(){
  if(interrupted())return false;
  try{if(session)session.type='playback';}catch{/* Native audio still works without this feature. */}
  return true;
 }
 function subscribe(listener){
  try{session?.addEventListener('statechange',listener);return ()=>session?.removeEventListener('statechange',listener);}catch{return ()=>{};}
 }
 return {interrupted,prepare,subscribe};
}
