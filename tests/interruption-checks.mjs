import assert from 'node:assert/strict';
// Explicit fault injection of AudioSession state, not a physical iPhone test.
// The media itself is the real, unchanged Release asset.
export async function interruptionChecks(browser,site,book,check,observe){
 const context=await browser.newContext(),page=await context.newPage();observe(page);
 const ch=book.chapters[0],position=73.25,events=[];let release;const gate=new Promise(r=>release=r);
 await context.addInitScript(({bookId,chapterId,position})=>{
  localStorage.setItem('daily-reading-github:v1',JSON.stringify({schema:1,activeBook:bookId,books:{[bookId]:{activeChapter:chapterId,chapters:{[chapterId]:{positionSec:position,rate:1.5}}}}}));
  const session=new EventTarget();session.state='active';session.type='auto';
  Object.defineProperty(navigator,'audioSession',{configurable:true,value:session});
  window.__testAudioSession=session;
  window.__nativePlayCalls=0;const nativePlay=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){window.__nativePlayCalls++;return nativePlay.call(this);};
 },{bookId:book.bookId,chapterId:ch.chapterId,position});
 page.on('console',m=>{if(m.text().startsWith('audio-recovery '))events.push(JSON.parse(m.text().slice(15)));});
 await page.route('**/releases/download/**',async route=>{await gate;try{await route.continue();}catch{/* The original metadata request can be cancelled. */}});
 try{
  await page.goto(site+'#book/'+book.bookId,{waitUntil:'domcontentloaded'});
  await page.locator('[data-play="'+ch.chapterId+'"]').click();
  await page.evaluate(()=>{window.__testAudioSession.state='interrupted';document.querySelector('audio').pause();window.__testAudioSession.dispatchEvent(new Event('statechange'));});
  await page.locator('#status').filter({hasText:'系統暫時中斷音訊'}).waitFor();
  await page.waitForTimeout(18000);assert.equal(events.length,0);
  assert.equal(await page.evaluate(()=>window.__testAudioSession.type),'playback');
  assert.equal(await page.evaluate(()=>window.__nativePlayCalls),1);
  const saved=await page.evaluate(({bookId,chapterId})=>JSON.parse(localStorage.getItem('daily-reading-github:v1')).books[bookId].chapters[chapterId].positionSec,{bookId:book.bookId,chapterId:ch.chapterId});assert.equal(saved,position);
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));assert.equal(events.length,0);
  check('injected OS interruption holds a pending real load without reconnecting, reclaiming focus or clearing 73.25s');
  release();
  await page.getByRole('button',{name:'播放',exact:true}).click();
  await page.waitForFunction(position=>{const a=document.querySelector('audio');return !a.paused&&!a.seeking&&!a.error&&a.currentTime>position+.2&&a.currentTime<position+15;},position,{timeout:60000});
  assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1.5);assert.equal(events.length,0);
  assert.equal(await page.evaluate(()=>window.__nativePlayCalls),2);
  check('explicit user play reaches native playback despite an injected stale interruption, preserving 73.25s and 1.5x');
  await page.evaluate(()=>{window.__testAudioSession.state='active';window.__testAudioSession.dispatchEvent(new Event('statechange'));});
  await page.getByRole('button',{name:'暫停',exact:true}).click();
  await page.evaluate(()=>{const s=window.__testAudioSession;s.state='interrupted';s.dispatchEvent(new Event('statechange'));s.state='active';s.dispatchEvent(new Event('statechange'));});
  await page.waitForTimeout(3500);assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);assert.equal(events.length,0);
  check('injected interruption ending does not restart an explicitly paused player');
 }finally{release();await context.close();}
}
