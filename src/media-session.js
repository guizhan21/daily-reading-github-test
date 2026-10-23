// Feature-detected OS controls. Unsupported actions never interfere with native audio.
export function bindMediaSession(audio, hooks, platform = navigator) {
 const session=platform.mediaSession;if(!session)return {update(){},supported:[]};
 const supported=[],handlers={play:hooks.play,pause:hooks.pause,stop:hooks.pause,previoustrack:hooks.previous,nexttrack:hooks.next,seekbackward:d=>hooks.seek(audio.currentTime-(Number.isFinite(d?.seekOffset)&&d.seekOffset>0?d.seekOffset:15)),seekforward:d=>hooks.seek(audio.currentTime+(Number.isFinite(d?.seekOffset)&&d.seekOffset>0?d.seekOffset:15)),seekto:d=>{if(Number.isFinite(d?.seekTime))hooks.seek(d.seekTime);}};
 for(const [action,handler] of Object.entries(handlers))try{session.setActionHandler(action,handler);supported.push(action);}catch{/* Browser does not expose every media action. */}
 let key='',claimed=false;
 function update(){
  const current=hooks.current();if(!current)return;
  if(!audio.paused)claimed=true;if(!claimed)return;
  try{
   const next=current.bookId+'/'+current.chapterId;
   if(next!==key&&typeof MediaMetadata!=='undefined'){session.metadata=new MediaMetadata({title:current.chapterTitle,artist:current.bookTitle,album:'日讀 · 每日讀書',artwork:current.cover?[{src:new URL(current.cover,document.baseURI).href}]:[]});key=next;}
   session.playbackState=audio.paused?'paused':'playing';
   if(session.setPositionState&&Number.isFinite(audio.duration)&&audio.duration>0&&Number.isFinite(audio.playbackRate)&&audio.playbackRate>0)session.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate,position:Math.min(audio.duration,Math.max(0,audio.currentTime||0))});
  }catch{/* Media playback itself remains authoritative on unsupported platforms. */}
 }
 for(const event of ['playing','pause','loadedmetadata','seeked','ratechange','timeupdate'])audio.addEventListener(event,update);
 return {update,supported};
}
