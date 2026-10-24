// A native media request may hang without error. A timeout is a recovery
// opportunity, never a failed download. Use position progress, not paused alone.
export function createPlaybackHealth({read,recover,status,now=()=>performance.now(),stallMs=15000,maxAttempts=2}) {
 let token,lastTime=0,lastProgress=now(),lastStatus='';
 const notify=(kind,seconds=0)=>{if(kind!==lastStatus){lastStatus=kind;status(kind,seconds);}};
 function reset(s,t){token=s.token;lastTime=s.time;lastProgress=t;}
 function tick(){
  const s=read(),t=now();
  if(token!==s.token){reset(s,t);lastStatus='';}
  if(s.intent&&s.interrupted){reset(s,t);notify('interrupted');return;}
  if(!s.intent||s.ended||(!s.loading&&s.paused)){reset(s,t);notify('idle');return;}
  if(Number.isFinite(s.time)&&Math.abs(s.time-lastTime)>.05){reset(s,t);notify('healthy');return;}
  if(s.offline){lastProgress=t;notify('offline');return;}
  const idle=t-lastProgress;
  if(idle<3000)return;
  if(idle<stallMs){notify('buffering',Math.floor(idle/1000));return;}
  if(s.attempt>=maxAttempts){notify('waiting',Math.floor(idle/1000));return;}
  lastProgress=t;notify('recovering');recover('stalled');
 }
 return {tick,reset(){token=undefined;lastStatus='';}};
}
