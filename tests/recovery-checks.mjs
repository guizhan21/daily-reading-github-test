import assert from 'node:assert/strict';
// Deliberately hold a real Release request without returning HTTP or media error.
// The player must recover using the original canonical URL and saved offset.
export async function recoveryChecks(browser,site,book,check,observe){
 const context=await browser.newContext(),page=await context.newPage();observe(page);
 const ch=book.chapters[0],position=73.25;let release;const gate=new Promise(r=>release=r);
 await context.addInitScript(({id,ch,position})=>localStorage.setItem('daily-reading-github:v1',JSON.stringify({schema:1,activeBook:id,books:{[id]:{activeChapter:ch,chapters:{[ch]:{positionSec:position,rate:1.5}}}}})),{id:book.bookId,ch:ch.chapterId,position});
 const events=[];page.on('console',m=>{if(m.text().startsWith('audio-recovery ')){events.push(JSON.parse(m.text().slice(15)));release();}});
 await page.route('**/releases/download/**',async route=>{if(route.request().url()===ch.audioUrl&&!events.length)await gate;try{await route.continue();}catch{/* Native engines may abort metadata probes before the user presses play. */}});
 try{
  await page.goto(site+'#book/'+book.bookId,{waitUntil:'domcontentloaded'});
  await page.locator('audio').evaluate(a=>{a.dataset.retryLoads='0';a.addEventListener('loadstart',()=>a.dataset.retryLoads=String(Number(a.dataset.retryLoads)+1));});
  await page.locator('[data-play="'+ch.chapterId+'"]').click();
  await page.locator('#status').filter({hasText:'正在緩衝'}).waitFor({timeout:12000});
  const beforeRetry=Number(await page.locator('audio').getAttribute('data-retry-loads'));
  assert.equal(await page.locator('audio').evaluate(a=>a.error?.code||null),null);
  if(!events.length)await page.waitForEvent('console',{predicate:m=>m.text().startsWith('audio-recovery '),timeout:22000});
  release();
  await page.waitForFunction(({url,position})=>{const a=document.querySelector('audio');return a.currentSrc===url&&!a.paused&&!a.seeking&&!a.error&&a.currentTime>position+.2&&a.currentTime<position+12;},{url:ch.audioUrl,position},{timeout:60000,polling:100});
  assert.equal(events.length,1);assert.equal(events[0].reason,'stalled');assert.equal(events[0].positionSec,position);assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1.5);assert.ok(Number(await page.locator('audio').getAttribute('data-retry-loads'))>beforeRetry,'Recovery must actually restart the media request');
  check('hanging request without native error reconnects once at the exact saved position and speed');
  await page.getByRole('button',{name:'暫停',exact:true}).click();
  const count=events.length;await page.waitForTimeout(3500);assert.equal(events.length,count);assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);
  check('explicit pause cancels stall recovery and preserves user intent');
  // State fault injection only: simulate a dropped native seek command, with
  // paused=true and seeking=false. Verify the application range-input contract
  // and a real source reload to 95s without starting playback.
  await page.locator('audio').evaluate(a=>{const native=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');Object.defineProperty(a,'currentTime',{configurable:true,get(){return native.get.call(this);},set(){/* Simulate the engine dropping a requested seek. */}});a.addEventListener('loadstart',()=>{delete a.currentTime;},{once:true});});
  await page.locator('#seek').evaluate(input=>{input.value='95';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForEvent('console',{predicate:m=>m.text().startsWith('audio-recovery '),timeout:25000});
  await page.waitForFunction(()=>{const a=document.querySelector('audio');return a.paused&&!a.seeking&&a.readyState>=2&&Math.abs(a.currentTime-95)<.5;},{},{timeout:60000,polling:100});
  assert.equal(events.length,2);assert.equal(events[1].positionSec,95);assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1.5);
  check('simulated dropped seek command recovers the real source at 95 seconds while remaining paused');
 }catch(e){e.message+='\nRecovery diagnostic: '+JSON.stringify(await page.locator('audio').evaluate(a=>({time:a.currentTime,paused:a.paused,seeking:a.seeking,ready:a.readyState,network:a.networkState,error:a.error?.message,status:document.querySelector('#status').textContent})));throw e;}finally{release();await context.close();}
}
