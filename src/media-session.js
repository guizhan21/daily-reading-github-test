// Feature-detected OS controls. Unsupported actions never interfere with native audio.
export function bindMediaSession(audio, hooks, platform = navigator) {
 const session=platform.mediaSession;if(!session)return {update(){},supported:[]};
 const supported=[],handlers={play:hooks.play,pause:hooks.pause,stop:hooks.pause,previoustrack:hooks.previous,nexttrack:hooks.next,seekbackward:d=>hooks.seek(audio.currentTime-(Number.isFinite(d?.seekOffset)&&d.seekOffset>0?d.seekOffset:15)),seekforward:d=>hooks.seek(audio.currentTime+(Number.isFinite(d?.seekOffset)&&d.seekOffset>0?d.seekOffset:15)),seekto:d=>{if(Number.isFinite(d?.seekTime))hooks.seek(d.seekTime);}};
 for(const [action,handler] of Object.entries(handlers))try{session.setActionHandler(action,handler);supported.push(action);}catch{/* Browser does not expose every media action. */}
 let claimed=false;
 function update(){
  const current=hooks.current();if(!current)return;
  if(!audio.paused)claimed=true;if(!claimed)return;
  // Native sessions can lose metadata after suspension without changing the
  // selected chapter. Check the actual platform value, not only a cached ID.
  try{
   const artwork=current.cover?new URL(current.cover,document.baseURI).href:null,metadata=session.metadata;
   if(typeof MediaMetadata!=='undefined'&&(!metadata||metadata.title!==current.chapterTitle||metadata.artist!==current.bookTitle||metadata.album!=='日讀 · 每日讀書'||(metadata.artwork?.[0]?.src??null)!==artwork))session.metadata=new MediaMetadata({title:current.chapterTitle,artist:current.bookTitle,album:'日讀 · 每日讀書',artwork:artwork?[{src:artwork}]:[]});
  }catch{/* A platform metadata failure must not block the other controls. */}
  // Keep one OS session across ended->next-source instead of releasing it.
  try{session.playbackState=audio.paused&&!hooks.transitioning?.()?'paused':'playing';}catch{/* Optional API. */}
  try{if(session.setPositionState&&Number.isFinite(audio.duration)&&audio.duration>0&&Number.isFinite(audio.playbackRate)&&audio.playbackRate>0)session.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate,position:Math.min(audio.duration,Math.max(0,audio.currentTime||0))});}catch{/* Optional API. */}
 }
 for(const event of ['playing','pause','loadedmetadata','seeked','ratechange','timeupdate'])audio.addEventListener(event,update);
 return {update,supported};
}
