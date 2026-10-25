// A bounded, device-local event trace. Never store URLs, signed query strings,
// cookies, titles or credentials, and never send the trace to a server.
const key='daily-reading-github:playback-log:v1',limit=100;
const id=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,160}$/.test(value)?value:null;
const number=value=>Number.isFinite(value)?Math.max(0,Math.round(value*1000)/1000):null;
const origin=value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.origin:null;}catch{return null;}};
export function safePlaybackEvent(kind,audio,state={},context={}){
 return {kind:/^[a-z-]{1,40}$/.test(kind)?kind:'unknown',at:Date.now(),bookId:id(state.bookId),chapterId:id(state.chapterId),intent:state.intent===true,loading:state.loading===true,positionSec:number(audio.currentTime),durationSec:number(audio.duration),rate:number(audio.playbackRate),paused:audio.paused===true,ended:audio.ended===true,seeking:audio.seeking===true,readyState:number(audio.readyState),networkState:number(audio.networkState),errorCode:number(audio.error?.code),sourceOrigin:origin(audio.currentSrc),sessionState:['active','inactive','interrupted'].includes(context.sessionState)?context.sessionState:null,sessionType:['auto','playback'].includes(context.sessionType)?context.sessionType:null,visibility:['hidden','visible'].includes(context.visibility)?context.visibility:null,standalone:context.standalone===true,displayStandalone:context.displayStandalone===true,pageOrigin:origin(context.pageOrigin),referrerOrigin:origin(context.referrer),openerPresent:context.openerPresent===true};
}
export function createPlaybackDiagnostics(audio,{read,platform=globalThis}){
 let storage,events=[];
 try{storage=platform.localStorage;}catch{/* Private browsing may deny storage. */}
 // Prior records are emitted by this exact schema; whitelist them again before
 // export rather than trusting arbitrary values stored under the key.
 try{const previous=JSON.parse(storage?.getItem(key));if(previous?.schema===1&&Array.isArray(previous.events))events=previous.events.slice(-limit).map(e=>({...safePlaybackEvent(e.kind,{currentTime:e.positionSec,duration:e.durationSec,playbackRate:e.rate,paused:e.paused,ended:e.ended,seeking:e.seeking,readyState:e.readyState,networkState:e.networkState,error:{code:e.errorCode},currentSrc:e.sourceOrigin},e,{...e,referrer:e.referrerOrigin}),at:number(e.at)}));}catch{/* A bad trace cannot break playback. */}
 function record(kind){
  try{const nav=platform.navigator,context={sessionState:nav?.audioSession?.state,sessionType:nav?.audioSession?.type,visibility:platform.document?.visibilityState,standalone:nav?.standalone,displayStandalone:platform.matchMedia?.('(display-mode: standalone)').matches,pageOrigin:platform.location?.origin,referrer:platform.document?.referrer,openerPresent:!!platform.opener};events.push(safePlaybackEvent(kind,audio,read(),context));events=events.slice(-limit);try{storage?.setItem(key,JSON.stringify({schema:1,events}));}catch{/* Keep the in-memory trace if storage is full. */}}catch{/* Optional diagnostics never affect playback. */}
 }
 for(const event of ['loadstart','emptied','playing','pause','waiting','stalled','ended','error'])audio.addEventListener(event,()=>record(event));
 try{platform.navigator?.audioSession?.addEventListener('statechange',()=>record('session-change'));}catch{/* Optional API. */}
 platform.document?.addEventListener('visibilitychange',()=>record('visibility-change'));
 for(const event of ['pageshow','pagehide'])platform.addEventListener?.(event,()=>record(event));
 record('page-open');
 return {record,export(){return {schema:1,application:'daily-reading',events:structuredClone(events),limits:['No native iOS parent-application identifier is exposed to the web page.','These events cannot prove which App Dynamic Island will open.']};}};
}
