import assert from 'node:assert/strict';

// Fault injection tests application policy, not iPhone OS ownership. The audio
// element, stream, decoder, seek and advancing clock are real.
export async function sessionRecoveryChecks(browser,site,book,check,observe){
 const context=await browser.newContext(),page=await context.newPage(),ch=book.chapters[0];observe(page);
 await context.addInitScript(()=>{
  const state=new EventTarget();state.state='interrupted';state.type='auto';
  Object.defineProperty(navigator,'audioSession',{configurable:true,value:state});window.__sessionFault=state;
  window.__nativePlayCalls=0;const native=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){window.__nativePlayCalls++;return native.call(this);};
  window.__osHandlers={};if(navigator.mediaSession){const original=navigator.mediaSession.setActionHandler;navigator.mediaSession.setActionHandler=function(action,handler){window.__osHandlers[action]=handler;return original.call(this,action,handler);};}
 });
 const playing=()=>page.waitForFunction(()=>{const a=document.querySelector('audio');return !a.paused&&!a.error&&a.readyState>=2&&a.currentTime>.2;},{},{timeout:60000});
 try{
  await page.goto(site+'#book/'+book.bookId,{waitUntil:'domcontentloaded'});await page.locator('[data-play="'+ch.chapterId+'"]').click();
  assert.equal(await page.evaluate(()=>window.__nativePlayCalls),1);await playing();assert.equal(await page.evaluate(()=>window.__sessionFault.state),'interrupted');
  check('explicit chapter play reaches the real decoder despite a stale injected AudioSession interruption');
  await page.getByRole('button',{name:'暫停',exact:true}).click();
  await page.locator('audio').evaluate(a=>a.currentTime=37);await page.waitForFunction(()=>{const a=document.querySelector('audio');return !a.seeking&&Math.abs(a.currentTime-37)<.5;},{},{timeout:45000});
  await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForFunction(()=>document.querySelector('audio').currentTime>37.2,{},{timeout:60000});
  assert.equal(await page.evaluate(()=>window.__nativePlayCalls),2);check('manual resume during a stale interruption retains the actual 37-second position');
  if(await page.evaluate(()=>Boolean(window.__osHandlers.play))){
   await page.evaluate(()=>window.__osHandlers.pause());const before=await page.locator('audio').evaluate(a=>a.currentTime);
   await page.evaluate(()=>window.__osHandlers.play());await page.waitForFunction(t=>{const a=document.querySelector('audio');return !a.paused&&!a.error&&a.currentTime>t+.2;},before,{timeout:60000});
   assert.equal(await page.evaluate(()=>window.__nativePlayCalls),3);check('simulated OS Play action reaches real playback while the injected session state is still interrupted');
   await page.evaluate(()=>{navigator.mediaSession.metadata=null;});
   await page.waitForFunction(title=>navigator.mediaSession.metadata?.title===title,ch.title,{timeout:5000});
   assert.equal(await page.evaluate(()=>navigator.mediaSession.metadata.artist),book.title);check('same-chapter native playback repairs platform-cleared Media Session metadata');
  }
  await page.getByRole('button',{name:'暫停',exact:true}).click();const count=await page.evaluate(()=>window.__nativePlayCalls);
  await page.evaluate(()=>{window.__sessionFault.state='active';window.__sessionFault.dispatchEvent(new Event('statechange'));window.dispatchEvent(new Event('online'));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
  await page.waitForTimeout(2000);assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);assert.equal(await page.evaluate(()=>window.__nativePlayCalls),count);
  check('interruption end, online and simulated BFCache restore do not override an explicit user pause');
  return {simulatedAudioSession:true,simulatedOSCommands:true,physicalIPhone:false,mediaSessionActionsSupported:await page.evaluate(()=>Boolean(window.__osHandlers.play))};
 }finally{await context.close();}
}
