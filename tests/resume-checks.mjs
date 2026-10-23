import assert from 'node:assert/strict';

// Real Release AAC, real seeks and page lifecycle. No mocked audio clock.
export async function resumeChecks(page, book, check) {
 const [first,second]=book.chapters;
 const media=()=>page.locator('audio');
 const saved=id=>page.evaluate(({bookId,id})=>JSON.parse(localStorage.getItem('daily-reading-github:v1')).books[bookId].chapters[id],{bookId:book.bookId,id});
 const playing=ch=>page.waitForFunction(url=>{const a=document.querySelector('audio');return a.currentSrc===url&&!a.paused&&!a.seeking&&a.currentTime>.2;},ch.audioUrl,{timeout:60000});
 const pause=()=>page.getByRole('button',{name:'暫停',exact:true}).click();
 const seek=async seconds=>{await media().evaluate((a,t)=>a.currentTime=t,seconds);await page.waitForFunction(t=>{const a=document.querySelector('audio');return !a.seeking&&Math.abs(a.currentTime-t)<1;},seconds,{timeout:45000});};
 const select=async ch=>{await page.locator('[data-play="'+ch.chapterId+'"]').click();await playing(ch);await pause();};
 await page.goto(new URL('#book/'+book.bookId,page.url()).href,{waitUntil:'domcontentloaded'});
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
 await page.locator('nav[aria-label="主選單"] a[href="#library"]').click();
 await page.locator('#book-select [data-book="'+book.bookId+'"]').click();
 await page.locator('#start-book').click();await playing(first);await pause();assert.ok(Math.abs(await media().evaluate(a=>a.currentTime)-position)<3);
 check('reopening a book and Continue uses the last unfinished chapter and position');
 position=(await saved(first.chapterId)).positionSec;
 // Reload twice while metadata is pending: pagehide must not replace 37s with zero.
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
 await page.waitForFunction(t=>{const a=document.querySelector('audio');return a.readyState>=2&&!a.seeking&&Math.abs(a.currentTime-t)<1;},position,{timeout:60000});await page.unroute('**/releases/download/**',hold);
 check('slow loading and repeated reloads preserve the saved position before seek completes');
 await page.getByRole('button',{name:'從頭播放本章',exact:true}).click();await playing(first);assert.ok(await media().evaluate(a=>a.currentTime)<4);await pause();
 check('explicit Restart clears only the chosen chapter position');
 assert.ok(Math.abs((await saved(second.chapterId)).positionSec-63)<1);
 await select(first);const duration=await media().evaluate(a=>a.duration);await seek(duration-.35);
 await page.getByRole('button',{name:'播放',exact:true}).click();await playing(second);await pause();
 assert.equal((await saved(first.chapterId)).completed,true);
 await select(first);assert.ok(await media().evaluate(a=>a.currentTime)<4);
 check('real ended marks completion, advances, and a finished chapter replays from zero');
 await seek(19);await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const a=document.querySelector('audio');return a.readyState>=2&&!a.seeking&&Math.abs(a.currentTime-19)<1;},{},{timeout:60000});
 check('intentional backward seek survives a fresh page load');
}
