import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {chromium,firefox,webkit} from 'playwright';import {root,load} from '../scripts/catalog.mjs';
import {resumeChecks} from './resume-checks.mjs';
import {shelfChecks} from './shelf-checks.mjs';
import {appearanceChecks} from './appearance-checks.mjs';
const site=process.env.SITE_URL||'https://guizhan21.github.io/daily-reading-github-test/',selected=process.env.BROWSER||'chrome',books=load('data/books.json').books;
const engines={chrome:[chromium,process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{channel:'chrome'}],firefox:[firefox,{}],webkit:[webkit,{}]};
const output=path.join(root,'test-results');fs.mkdirSync(output,{recursive:true});const results=[];
for(const [name,[engine,options]] of Object.entries(engines)){
 if(selected!=='all'&&name!==selected)continue;
 const r={browser:name,engine:name==='chrome'?(process.env.CHROME_EXECUTABLE?'project-installed Chromium executable':'Google Chrome'):name,site,checkedAt:new Date().toISOString(),checks:[],audio:[],errors:[],downloads:[],mediaResponses:[],mediaRecoveries:[],iPhonePhysical:false,lockScreen:false};let browser,lastPage;
 const check=(name,data={})=>{r.checks.push({name,pass:true,...data});console.log(r.browser+': PASS '+name);};
 try{
  browser=await engine.launch({headless:true,...options,...(name==='firefox'?{env:{...process.env,MOZ_LOG:'AudioStream:4,cubeb:4,PlatformDecoderModule:4',MOZ_LOG_FILE:path.join(output,'firefox-media.log')}}:{})});r.version=browser.version();const context=await browser.newContext({viewport:{width:1280,height:900}});let page=await context.newPage();
  const observe=p=>{lastPage=p;p.on('pageerror',e=>r.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')r.errors.push(m.text());if(m.text().startsWith('audio-recovery '))r.mediaRecoveries.push(JSON.parse(m.text().slice(15)));});p.on('download',d=>r.downloads.push(d.suggestedFilename()));p.on('response',async response=>{try{if(/release-assets\.githubusercontent\.com/.test(response.url())){const h=await response.allHeaders();r.mediaResponses.push({origin:new URL(response.url()).origin,status:response.status(),range:h['content-range'],type:h['content-type'],disposition:h['content-disposition']});}}catch{}});};observe(page);
  // Hold only the first real media request so an early user rate change precedes metadata.
  let releaseMetadata;
  if(name==='chrome'){const gate=new Promise(resolve=>releaseMetadata=resolve);await page.route('**/releases/download/**',async route=>{await gate;try{await route.continue();}catch{/* A source replaced by selectChapter may already be aborted. Actual playback is still required. */}});}
  await page.goto(site,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'今日書房.'}).waitFor();check('nature landscape home and three shelf entry points');
  async function openBook(b){for(const shelf of ['unread','reading','completed']){await page.locator('.sidebar nav a[href="#library/'+shelf+'"]').click();await page.locator('#book-select[data-shelf="'+shelf+'"]').waitFor();if(await page.locator('#book-select [data-book="'+b.bookId+'"]').count())break;}await page.locator('#book-select [data-book="'+b.bookId+'"]').click();await page.locator('#book-title').waitFor();assert.equal(await page.locator('#book-title').innerText(),b.title);}
  async function ready(){await page.waitForFunction(()=>document.querySelector('audio')?.readyState>=1,{},{timeout:60000});}
  for(const b of books){
   await openBook(b);assert.equal(await page.locator('[data-play]').count(),b.chapters.length);
   await page.waitForFunction(()=>{const e=document.querySelector('#cover');return e&&(e.tagName==='IMG'?e.complete&&e.naturalWidth>0:e.getBoundingClientRect().width>0);},{},{timeout:60000});check('book detail, chapter order and original cover: '+b.bookId);
   await page.locator('[data-read="'+b.chapters[0].chapterId+'"]').click();assert.ok((await page.locator('#reader-content').innerText()).length>1500);assert.ok((await page.locator('#markdown-download').getAttribute('href')).endsWith('.md'));check('complete original Markdown and source download: '+b.bookId);
   await page.locator('#close-reader').click();
   const sample=name==='chrome'?b.chapters:b.chapters.slice(0,2);
   for(const ch of sample){
    await page.locator('[data-play="'+ch.chapterId+'"]').click();
    const earlyRate=name==='chrome'&&b.bookId===books[0].bookId&&ch.chapterId===b.chapters[0].chapterId;
    if(earlyRate){await page.getByRole('button',{name:'1.5 倍',exact:true}).click();assert.equal(await page.locator('audio').evaluate(a=>a.readyState),0);releaseMetadata();}
    await page.waitForFunction(u=>{const a=document.querySelector('audio');return a.currentSrc===u&&a.readyState>=2&&!a.error&&!a.paused&&a.currentTime>.3;},ch.audioUrl,{timeout:60000});
    const actual=await page.locator('audio').evaluate(a=>({duration:a.duration,time:a.currentTime}));assert.ok(Math.abs(actual.duration-ch.durationSec)<1);
    if(earlyRate){assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1.5);check('early rate choice survives metadata loading');await page.unroute('**/releases/download/**');}
    await page.getByRole('button',{name:'暫停',exact:true}).click();r.audio.push({bookId:b.bookId,chapterId:ch.chapterId,actualPlayback:true,durationSec:actual.duration});check('Release playback: '+ch.chapterId);
   }
  }
  // Exercise actual pointer seeking and persistence using a stable first chapter.
  const b=books[0],ch=b.chapters[0];await openBook(b);await page.locator('[data-play="'+ch.chapterId+'"]').click();await ready();await page.getByRole('button',{name:'暫停',exact:true}).click();
  await page.getByRole('button',{name:'1.5 倍',exact:true}).click();assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1.5);check('playback speed');
  const beforeScrub=await page.locator('audio').evaluate(a=>a.currentTime),box=await page.getByLabel('播放進度',{exact:true}).boundingBox();await page.mouse.move(box.x+box.width*.05,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.55,box.y+box.height/2,{steps:8});assert.ok(Math.abs(await page.locator('audio').evaluate(a=>a.currentTime)-beforeScrub)<.1);check('drag previews time without repeatedly interrupting the decoder');await page.mouse.up();
  await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForFunction(d=>{const a=document.querySelector('audio');return !a.error&&!a.seeking&&a.currentTime>d*.45&&a.currentTime<d*.7;},ch.durationSec,{timeout:45000});check('real pointer seek to middle and actual playback');
  await page.getByRole('button',{name:'暫停',exact:true}).click();let saved=await page.locator('audio').evaluate(a=>a.currentTime);
  await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1.5);
  await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForFunction(t=>{const a=document.querySelector('audio');return !a.error&&!a.seeking&&a.currentTime>t+.3&&a.currentTime<t+15;},saved,{timeout:45000});await page.getByRole('button',{name:'暫停',exact:true}).click();saved=await page.locator('audio').evaluate(a=>a.currentTime);check('refresh resumes saved position and speed');
  await page.close();page=await context.newPage();observe(page);await page.goto(site+'#book/'+b.bookId,{waitUntil:'domcontentloaded'});await ready();await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForFunction(t=>document.querySelector('audio').currentTime>t+.3,saved,{timeout:45000});await page.getByRole('button',{name:'暫停',exact:true}).click();check('close and reopen restores device-local progress');
  await page.getByRole('button',{name:'下一章',exact:true}).click();await page.waitForFunction(u=>{const a=document.querySelector('audio');return a.currentSrc===u&&a.currentTime>.3&&!a.paused;},b.chapters[1].audioUrl,{timeout:60000});await page.getByRole('button',{name:'暫停',exact:true}).click();check('next chapter');
  await page.getByLabel('播放進度',{exact:true}).focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return a.currentTime>0&&a.currentTime<4&&!a.seeking;},{},{timeout:45000});await page.getByRole('button',{name:'暫停',exact:true}).click();check('intentional backwards seek');
  await page.reload({waitUntil:'domcontentloaded'});await ready();assert.ok((await page.locator('audio').getAttribute('src')).includes(b.chapters[1].chapterId));check('chapter selection persists');
  await page.locator('[data-read="'+ch.chapterId+'"]').click();await page.mouse.wheel(0,800);await page.waitForTimeout(1200);const reading=await page.evaluate(()=>window.scrollY);assert.ok(reading>100);await page.reload({waitUntil:'domcontentloaded'});await page.locator('#reader-content article').waitFor();assert.ok(Math.abs(await page.evaluate(()=>window.scrollY)-reading)<120);check('reading chapter and scroll position survive refresh');
  await page.locator('nav[aria-label="主選單"] a[href="#library/reading"]').click();await page.getByLabel('搜尋書籍',{exact:true}).fill(books.at(-1).title);assert.equal(await page.locator('#book-select [data-book]').count(),1);check('title search');
  await page.getByLabel('搜尋書籍',{exact:true}).fill('不存在書籍XYZ');assert.equal(await page.locator('#book-select [data-book]').count(),0);check('empty search');
  await page.locator('.filter-tabs a[href="#library/reading?category=professional"]').click();await page.locator('.filter-tabs a.active[href="#library/reading?category=professional"]').waitFor();assert.equal(await page.locator('#book-select [data-book]').count(),books.filter(b=>b.category==='AI 講師與顧問專業養成').length);check('category filtering');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));check('390px mobile library layout');
  await page.locator('#book-select [data-book]').first().click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('[data-read]').first().click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));check('mobile book, reader and persistent player layout');
  if(name!=='webkit')await page.screenshot({path:path.join(output,name+'-mobile.png'),caret:'initial'});
  assert.equal(r.downloads.length,0);check('audio element never triggers attachment download');assert.equal(r.errors.length,0,r.errors.join('\n'));check('no console, CSP, CORS or page errors');
  const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('daily-reading-github:v1')));assert.ok(Object.keys(progress.books).length>=books.length);fs.writeFileSync(path.join(output,name+'-progress.json'),JSON.stringify(progress,null,2));check('independent multi-book local progress');
  await page.setViewportSize({width:1280,height:900});await resumeChecks(page,books[0],check);
  await shelfChecks(browser,site,books,check,observe);
  await appearanceChecks(browser,site,books,check,observe);
  assert.equal(r.errors.length,0,r.errors.join('\n'));assert.equal(r.downloads.length,0);
  r.pass=true;
 }catch(e){r.pass=false;r.failure=e.message;try{if(lastPage&&!lastPage.isClosed()){r.lastMedia=await lastPage.locator('audio').evaluate(a=>({src:a.currentSrc,time:a.currentTime,duration:Number.isFinite(a.duration)?a.duration:null,paused:a.paused,seeking:a.seeking,readyState:a.readyState,networkState:a.networkState,error:a.error?.message||null}));r.playerStatus=await lastPage.locator('#status').innerText();await lastPage.screenshot({path:path.join(output,name+'-failure.png'),caret:'initial'});}}catch(d){r.diagnosticError=d.message;}console.log(name+': FAIL '+e.message);}finally{if(browser)await browser.close();results.push(r);fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify(r,null,2));}
}
fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
