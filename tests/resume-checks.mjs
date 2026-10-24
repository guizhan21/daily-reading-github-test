import assert from 'node:assert/strict';
import {chapterProgress} from '../src/progress.js';

// Real Release AAC, real seeks and page lifecycle. No mocked audio clock.
export async function resumeChecks(page, book, check) {
 await page.addInitScript(()=>{window.__resumeTrace=[];document.addEventListener('DOMContentLoaded',()=>{const a=document.querySelector('audio');for(const event of ['loadstart','emptied','loadedmetadata','loadeddata','canplay','error','seeking','seeked','play','playing','pause'])a.addEventListener(event,()=>window.__resumeTrace.push({event,at:performance.now(),time:a.currentTime,ready:a.readyState,paused:a.paused,errorCode:a.error?.code,message:a.error?.message}));});});
 const [first,second]=book.chapters;
 const media=()=>page.locator('audio');
 const saved=id=>page.evaluate(({bookId,id})=>JSON.parse(localStorage.getItem('daily-reading-github:v1')).books[bookId].chapters[id],{bookId:book.bookId,id});
 const playing=async (ch,startOverride)=>{const start=startOverride??chapterProgress(await saved(ch.chapterId),ch.durationSec).positionSec;console.log('resume-expect '+JSON.stringify({chapterId:ch.chapterId,start}));try{await page.waitForFunction(({url,start})=>{const a=document.querySelector('audio');return a.currentSrc===url&&!a.error&&!a.paused&&!a.seeking&&a.readyState>=2&&a.currentTime>start+.2&&a.currentTime<start+15;},{url:ch.audioUrl,start},{timeout:60000});}catch(error){error.message+='\nResume expectation: '+JSON.stringify({url:ch.audioUrl,start,saved:await saved(ch.chapterId),native:await media().evaluate(a=>({src:a.currentSrc,time:a.currentTime,paused:a.paused,ready:a.readyState,seeking:a.seeking,error:a.error?.message,errorCode:a.error?.code,status:document.querySelector('#status').textContent})),trace:await page.evaluate(()=>window.__resumeTrace||[])});throw error;}};
 const pause=()=>page.getByRole('button',{name:'暫停',exact:true}).click();
 const seek=async seconds=>{await media().evaluate((a,t)=>a.currentTime=t,seconds);await page.waitForFunction(t=>{const a=document.querySelector('audio');return !a.seeking&&Math.abs(a.currentTime-t)<1;},seconds,{timeout:45000});};
 const select=async ch=>{await page.locator('[data-play="'+ch.chapterId+'"]').click();await playing(ch);await pause();};
 await page.goto(new URL('#book/'+book.bookId,page.url()).href,{waitUntil:'domcontentloaded'});
 // Reopening now restores the independent reader, rather than showing chapter
 // controls beneath it. Use its visible return action before testing playback.
 await page.locator('#book-title').waitFor({state:'attached'});if(await page.locator('#reading').isVisible())await page.locator('#close-reader').click();
 await page.locator('[data-play="'+first.chapterId+'"]').waitFor();
 await select(first);await seek(37);let position=(await saved(first.chapterId)).positionSec;assert.ok(Math.abs(position-37)<1);
 await media().evaluate(a=>{a.dataset.testLoads='0';a.addEventListener('loadstart',()=>a.dataset.testLoads=String(Number(a.dataset.testLoads)+1));});
 await select(first);assert.ok(Math.abs(await media().evaluate(a=>a.currentTime)-position)<3);assert.equal(await media().getAttribute('data-test-loads'),'0');
 check('repeated chapter play resumes current position without reloading its source');
 position=(await saved(first.chapterId)).positionSec;
 await select(second);await seek(63);assert.ok(Math.abs((await saved(second.chapterId)).positionSec-63)<1);
 await select(first);assert.ok(Math.abs(await media().evaluate(a=>a.currentTime)-position)<3);
 check('chapter A and B keep separate exact positions across switches');
 position=(await saved(first.chapterId)).positionSec;
 await page.locator('nav[aria-label="主選單"] a[href="#library/reading"]').click();
 await page.locator('#book-select [data-book="'+book.bookId+'"]').click();
 await page.locator('#start-book').click();await playing(first);await pause();assert.ok(Math.abs(await media().evaluate(a=>a.currentTime)-position)<3);
 check('reopening a book and Continue uses the last unfinished chapter and position');
 position=(await saved(first.chapterId)).positionSec;
 // Reload twice while metadata is pending: pagehide must not replace 37s with zero.
 // Keep these pass-through routes for this page's remaining lifetime. Removing
 // Firefox interception while its native Range requests are in flight can abort
 // the transport after canplay. The page is closed with the test context.
 // This does not permit native media errors: later actual-play checks reject them.
 let release;const gate=new Promise(resolve=>release=resolve);
 const hold=async route=>{await gate;try{await route.continue();}catch{/* Navigation cancels the old pending request. */}};
 await page.route('**/releases/download/**',hold);
 try {
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('#now-title').waitFor();
  await page.waitForFunction(()=>document.querySelector('audio')?.getAttribute('src'));
  assert.ok(Math.abs((await saved(first.chapterId)).positionSec-position)<1);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('audio')?.getAttribute('src'));
  assert.ok(Math.abs((await saved(first.chapterId)).positionSec-position)<1);
 } finally {release();}
 await page.waitForFunction(t=>{const a=document.querySelector('audio');return a.readyState>=2&&!a.seeking&&Math.abs(a.currentTime-t)<1;},position,{timeout:60000});
 check('slow loading and repeated reloads preserve the saved position before seek completes');
 let releaseFallback;const fallbackGate=new Promise(resolve=>releaseFallback=resolve);
 const fallbackHold=async route=>{await fallbackGate;try{await route.continue();}catch{/* The previous pending resource may have been canceled by reload. */}};
 await page.route('**/releases/download/**',fallbackHold);
 try{await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('audio')?.getAttribute('src'));await media().evaluate(a=>a.onloadedmetadata=null);}finally{releaseFallback();}
 await page.waitForFunction(t=>{const a=document.querySelector('audio');return a.readyState>=2&&!a.seeking&&Math.abs(a.currentTime-t)<1;},position,{timeout:60000});
 assert.ok(Math.abs((await saved(first.chapterId)).positionSec-position)<1);console.log('fallback-native '+JSON.stringify(await media().evaluate(a=>({time:a.currentTime,ready:a.readyState,errorCode:a.error?.code,message:a.error?.message}))));
 check('native loadeddata and canplay restore the same position when metadata callback is not delivered');
 const loadsBeforeRestart=Number(await media().getAttribute('data-test-loads'));await page.getByRole('button',{name:'從頭播放本章',exact:true}).click();await playing(first,0);assert.equal(Number(await media().getAttribute('data-test-loads')),loadsBeforeRestart);assert.ok(await media().evaluate(a=>a.currentTime)<4);await pause();
 check('explicit Restart seeks the existing stream to zero without reloading and clears only its chapter');
 assert.ok(Math.abs((await saved(second.chapterId)).positionSec-63)<1);
 await select(first);const duration=await media().evaluate(a=>a.duration);await seek(duration-.35);
 await page.getByRole('button',{name:'播放',exact:true}).click();await playing(second,0);await pause();
 assert.equal((await saved(first.chapterId)).completed,true);
 await select(first);assert.ok(await media().evaluate(a=>a.currentTime)<4);
 check('real ended marks completion, advances, and a finished chapter replays from zero');
 await seek(19);await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const a=document.querySelector('audio');return a.readyState>=2&&!a.seeking&&Math.abs(a.currentTime-19)<1;},{},{timeout:60000});
 check('intentional backward seek survives a fresh page load');
}
