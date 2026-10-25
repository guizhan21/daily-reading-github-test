// Audio Session is optional. A system interruption is not a network failure,
// and automatic retries must never try to take audio focus from another app.
export function createAudioSession(platform=globalThis.navigator) {
 let session;
 try{session=platform?.audioSession;}catch{/* Some engines expose an unavailable API. */}
 const interrupted=()=>{try{return session?.state==='interrupted';}catch{return false;}};
 function prepare({userInitiated=false}={}){
  // A stale interrupted state must not veto a real Play button / OS media
  // command. Let native play() accept or reject that request. Timers and
  // automatic chapter recovery still yield to other applications.
  if(interrupted()&&!userInitiated)return false;
  try{if(session&&session.type!=='playback')session.type='playback';}catch{/* Native audio still works without this feature. */}
  return true;
 }
 function subscribe(listener){
  try{session?.addEventListener('statechange',listener);return ()=>session?.removeEventListener('statechange',listener);}catch{return ()=>{};}
 }
 return {interrupted,prepare,subscribe};
}
