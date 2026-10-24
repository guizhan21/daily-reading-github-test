import assert from 'node:assert/strict';
import path from 'node:path';
import {canonicalAudioURL} from '../src/media-source.js';

export async function completionChecks(browser,site,books,check,observe,{screenshots,browserName}={}){
 const book=books[0],key='daily-reading-github:v1',last=book.chapters.at(-1);
 async function create(seed,init){
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  if(seed)await context.addInitScript(({key,seed})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));},{key,seed});
  if(init)await context.addInitScript(init);
  const page=await context.newPage();observe(page);return {context,page};
 }
 const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const progress=(chapters,extra={})=>({schema:1,activeBook:book.bookId,books:{[book.bookId]:{activeChapter:last.chapterId,chapters,...extra}}});
 const nav=async(page,shelf)=>{await page.locator('.sidebar nav a[href="#library/'+shelf+'"]').click();await page.locator('#book-select[data-shelf="'+shelf+'"]').waitFor();};
 const card=page=>page.locator('#book-select [data-book="'+book.bookId+'"]');
 const chapter=async(page,ch)=>{await page.waitForFunction(url=>{const a=document.querySelector('audio');return a.currentSrc.replace(/[?]dr_retry=[12]-[a-z0-9-]+$/,'')===url&&!a.paused&&!a.seeking&&!a.error&&a.currentTime>.1;},ch.audioUrl,{timeout:60000});};
 const observeEnd=page=>page.locator('audio').evaluate(a=>{window.__completionNativeEnd=false;a.addEventListener('ended',event=>{window.__completionNativeEnd=event.isTrusted;},{once:true});});
 async function savedEnd(page,ch){
  // WebKit can expose ended=true to RAF before dispatching the queued native
  // ended event. Await the real event AND persisted result, not that early flag.
  await page.waitForFunction(({key,bookId,id})=>window.__completionNativeEnd&&document.querySelector('audio').ended&&JSON.parse(localStorage.getItem(key))?.books[bookId]?.chapters[id]?.completedOnce===true,{key,bookId:book.bookId,id:ch.chapterId},{timeout:60000});
  assert.equal(canonicalAudioURL(await page.locator('audio').evaluate(a=>a.currentSrc)),ch.audioUrl);
 }
 async function tail(page){
  const duration=await page.locator('audio').evaluate(a=>a.duration);
  // Select a short tail through the existing range input/change binding, then let native AAC
  // decoding reach a real ended event; no audio.ended/event property is faked.
  await page.locator('#seek').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},duration-.6);
  await page.waitForFunction(()=>!document.querySelector('audio').seeking,{},{timeout:45000});
 }
 const legacy=await create(progress(Object.fromEntries(book.chapters.map(c=>[c.chapterId,{positionSec:c.durationSec,completed:true,rate:1.5,readingY:250}])),{shelfOverride:'reading'}));
 try{
  await legacy.page.goto(site+'#library/completed',{waitUntil:'domcontentloaded'});await legacy.page.locator('#book-select').waitFor();assert.equal(await card(legacy.page).count(),1);
  const s=(await saved(legacy.page)).books[book.bookId];assert.equal(s.shelfOverride,undefined);for(const ch of book.chapters){assert.equal(s.chapters[ch.chapterId].completedOnce,true);assert.equal(s.chapters[ch.chapterId].rate,1.5);assert.equal(s.chapters[ch.chapterId].readingY,250);}
  await legacy.page.reload({waitUntil:'domcontentloaded'});await card(legacy.page).waitFor();check('legacy fully listened book repairs stale Reading and stays on Finished after refresh');
 }finally{await legacy.context.close();}
 const fresh=await create();
 try{
  const p=fresh.page;await p.goto(site+'#book/'+book.bookId,{waitUntil:'domcontentloaded'});await p.locator('#book-title').waitFor();await p.locator('[data-play="'+book.chapters[0].chapterId+'"]').click();const ends=[];
  for(const ch of book.chapters){
   await chapter(p,ch);
   if(ch===last){await nav(p,'reading');await card(p).waitFor();}
   await tail(p);
   await p.waitForFunction(({key,bookId,id})=>JSON.parse(localStorage.getItem(key))?.books[bookId]?.chapters[id]?.completedOnce===true,{key,bookId:book.bookId,id:ch.chapterId},{timeout:60000});
   ends.push({chapterId:ch.chapterId,...(await saved(p)).books[book.bookId].chapters[ch.chapterId]});
  }
  await p.waitForFunction(()=>document.querySelector('audio').ended,{},{timeout:60000});assert.equal(canonicalAudioURL(await p.locator('audio').evaluate(a=>a.currentSrc)),last.audioUrl);
  await card(p).waitFor({state:'detached'});assert.equal(await p.locator('.shelf-tabs [data-shelf-count="completed"]').innerText(),'1');await nav(p,'completed');assert.equal(await card(p).count(),1);
  if(screenshots&&browser.browserType().name()!=='webkit'){
   await p.setViewportSize({width:390,height:844});await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.top<innerHeight&&r.bottom>0;}).map(i=>i.decode()));const src=getComputedStyle(document.documentElement).getPropertyValue('--reference-image').trim().slice(4,-1).replace(/^['"]|['"]$/g,'');const image=new Image();image.src=src;await image.decode();});await p.screenshot({path:path.join(screenshots,browserName+'-auto-finished-shelf.png'),caret:'initial'});await p.setViewportSize({width:1280,height:900});
  }
  check('all original chapters reach native ended and automatically move the real book from Reading to Finished',{nativeEnds:ends,method:'Seek each original M4A to its short tail and decode to native end; not full-duration listening'});
  await nav(p,'completed');await p.reload({waitUntil:'domcontentloaded'});await card(p).waitFor();await card(p).click();const first=book.chapters[0];await p.locator('[data-play="'+first.chapterId+'"]').click();await chapter(p,first);await p.getByRole('button',{name:'暫停',exact:true}).click();
  await p.locator('#seek').evaluate(e=>{e.value='19';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
  await p.waitForFunction(()=>{const a=document.querySelector('audio');return !a.seeking&&Math.abs(a.currentTime-19)<.5;},{},{timeout:60000});
  assert.equal(await p.locator('[data-set-shelf="completed"]').getAttribute('aria-pressed'),'true');assert.ok((await p.locator('[data-progress="'+first.chapterId+'"]').innerText()).includes('已聽完'));
  await p.reload({waitUntil:'domcontentloaded'});await p.locator('#book-title').waitFor();await p.waitForFunction(()=>{const a=document.querySelector('audio');return a.readyState>=2&&!a.seeking&&Math.abs(a.currentTime-19)<.5;},{},{timeout:60000});assert.equal(await p.locator('[data-set-shelf="completed"]').getAttribute('aria-pressed'),'true');
  await p.close();const reopened=await fresh.context.newPage();observe(reopened);await reopened.goto(site+'#book/'+book.bookId,{waitUntil:'domcontentloaded'});await reopened.locator('#book-title').waitFor();await reopened.getByRole('button',{name:'播放',exact:true}).click();await reopened.waitForFunction(()=>{const a=document.querySelector('audio');return !a.paused&&a.currentTime>19.1&&a.currentTime<30;},{},{timeout:60000});await reopened.getByRole('button',{name:'暫停',exact:true}).click();
  assert.equal(await reopened.locator('[data-set-shelf="completed"]').getAttribute('aria-pressed'),'true');check('replay, backwards seek, refresh and close/reopen preserve Finished plus the new exact replay position');
  await reopened.locator('[data-set-shelf="unread"]').click();const reset=(await saved(reopened)).books[book.bookId];assert.ok(reset.chapters[first.chapterId].positionSec>=19);assert.ok(book.chapters.every(c=>reset.chapters[c.chapterId].completedOnce===false));
  await reopened.reload({waitUntil:'domcontentloaded'});await reopened.locator('#book-title').waitFor();assert.equal(await reopened.locator('[data-set-shelf="unread"]').getAttribute('aria-pressed'),'true');await reopened.locator('[data-play="'+first.chapterId+'"]').click();await chapter(reopened,first);await reopened.getByRole('button',{name:'暫停',exact:true}).click();assert.equal(await reopened.locator('[data-set-shelf="reading"]').getAttribute('aria-pressed'),'true');
  check('explicit Unread starts a new cycle while keeping actual positions; incomplete new listening stays Reading');
  if(screenshots&&browser.browserType().name()!=='webkit'){
   await reopened.setViewportSize({width:390,height:844});await reopened.evaluate(async()=>{await document.fonts.ready;await document.querySelector('.cover-large img')?.decode();});await reopened.screenshot({path:path.join(screenshots,browserName+'-new-reading-cycle.png'),caret:'initial'});
  }
 }finally{await fresh.context.close();}
 const partial=await create(progress({[last.chapterId]:{positionSec:last.durationSec-2}}));
 try{
  const p=partial.page;await p.goto(site+'#book/'+book.bookId,{waitUntil:'domcontentloaded'});await observeEnd(p);await p.locator('[data-play="'+last.chapterId+'"]').click();await savedEnd(p,last);assert.equal((await saved(p)).books[book.bookId].chapters[last.chapterId].completedOnce,true);assert.equal(await p.locator('[data-set-shelf="reading"]').getAttribute('aria-pressed'),'true');await nav(p,'completed');assert.equal(await card(p).count(),0);check('ending only the last chapter never marks missing earlier chapters or the whole book Finished');
 }finally{await partial.context.close();}
 if(browser.browserType().name()==='chromium'){
  // Fault injection only. The actual AAC element still reaches native ended.
  const stalled=await create(progress(Object.fromEntries(book.chapters.map(c=>[c.chapterId,c===last?{positionSec:0}:{completed:true}]))));let release;const gate=new Promise(r=>release=r);
  await stalled.page.route('**/releases/download/**',async route=>{await gate;try{await route.continue();}catch{}});
  try{
   const p=stalled.page;await p.goto(site+'#book/'+book.bookId,{waitUntil:'domcontentloaded'});await p.locator('audio[src]').waitFor({state:'attached'});await observeEnd(p);await p.locator('audio').evaluate(a=>{a.onloadedmetadata=null;a.onloadeddata=null;a.oncanplay=null;});release();await p.locator('[data-play="'+last.chapterId+'"]').click();await chapter(p,last);
   await p.locator('audio').evaluate(a=>{a.currentTime=a.duration-.5;});await savedEnd(p,last);assert.equal((await saved(p)).books[book.bookId].chapters[last.chapterId].completedOnce,true);assert.equal(await p.locator('[data-set-shelf="completed"]').getAttribute('aria-pressed'),'true');
   check('injected missing restore callbacks cannot discard a real native final-chapter end',{faultInjection:true,iPhonePhysical:false});
  }finally{release();await stalled.context.close();}
  const interrupted=await create(progress(Object.fromEntries(book.chapters.map(c=>[c.chapterId,c===last?{positionSec:last.durationSec-3}:{completed:true}]))),()=>{const s=new EventTarget();s.state='active';s.type='auto';Object.defineProperty(navigator,'audioSession',{configurable:true,value:s});window.__completionSession=s;});
  try{
   const p=interrupted.page;await p.goto(site+'#book/'+book.bookId,{waitUntil:'domcontentloaded'});await observeEnd(p);await p.locator('[data-play="'+last.chapterId+'"]').click();await chapter(p,last);await p.evaluate(()=>{const s=window.__completionSession;s.state='interrupted';s.dispatchEvent(new Event('statechange'));});await savedEnd(p,last);
   assert.equal((await saved(p)).books[book.bookId].chapters[last.chapterId].completedOnce,true);assert.equal(await p.locator('[data-set-shelf="completed"]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('audio').evaluate(a=>a.paused),true);
   check('injected Audio Session interruption still saves native completion without reclaiming playback',{faultInjection:true,iPhonePhysical:false});
  }finally{await interrupted.context.close();}
 }
}
