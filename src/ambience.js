// Decorative canvas only. No media clocks, audio contexts, global mouse capture or network.
export function initAmbience() {
 document.documentElement.dataset.pageHidden=String(document.hidden);
 let canvases=[],frame=0,last=0,phase=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const active=()=>document.documentElement.dataset.motion==='on'&&!reduced.matches&&!document.hidden&&canvases.length>0;
 function stop(){cancelAnimationFrame(frame);frame=0;}
 function draw(now){
  if(!active()){stop();return;}
  frame=requestAnimationFrame(draw);if(now-last<40)return;
  const elapsed=Math.min((now-last)||40,100);last=now;phase+=elapsed/1000;
  const night=document.documentElement.dataset.theme==='dark';
  for(const {canvas,ctx,points} of canvases){
   const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)continue;
   const scale=Math.min(devicePixelRatio||1,1.5),pw=Math.round(w*scale),ph=Math.round(h*scale);
   if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
   ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,w,h);
   for(const p of points){
    const x=((p.x+phase*p.speed)%1)*w,y=(p.y+Math.sin(phase*.35+p.phase)*.06)*h;
    ctx.globalAlpha=(night?.3:.22)+(.5+.5*Math.sin(phase*.7+p.phase))*(night?.5:.25);
    ctx.fillStyle=night?'#ffe5a0':'#e9c681';const size=night?p.size:p.size*.8;
    ctx.fillRect(Math.round(x),Math.round(y),size,size);
    if(night){ctx.globalAlpha*=.16;ctx.fillRect(Math.round(x)-3,Math.round(y)-3,size+6,size+6);}
   }
   ctx.globalAlpha=1;canvas.dataset.frames=String(Number(canvas.dataset.frames||0)+1);
  }
 }
 function resume(){stop();if(active()){last=performance.now();frame=requestAnimationFrame(draw);}else for(const c of canvases)c.ctx.clearRect(0,0,c.canvas.width,c.canvas.height);}
 function refresh(){stop();canvases=[...document.querySelectorAll('.scene-particles')].map(canvas=>({canvas,ctx:canvas.getContext('2d'),points:Array.from({length:innerWidth<560?14:28},(_,i)=>({x:((i*47+13)%101)/101,y:.25+((i*29)%68)/100,speed:.002+(i%4)*.0008,size:2+(i%3),phase:i*1.73}))})).filter(c=>c.ctx);resume();}
 document.addEventListener('appearancechange',resume);reduced.addEventListener('change',resume);
 document.addEventListener('visibilitychange',()=>{document.documentElement.dataset.pageHidden=String(document.hidden);resume();});
 return {refresh};
}
