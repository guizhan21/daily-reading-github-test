import fs from 'node:fs';import assert from 'node:assert/strict';
import {webkit} from 'playwright';
const day='test-results';fs.mkdirSync(day,{recursive:true});const unusedDayMarker='test-results',site='https://guizhan21.github.io/daily-reading-github-test/',key='daily-reading-github:v1';
const books=JSON.parse(fs.readFileSync('data/books.json')).books,b=books[0],ch=b.chapters[0];
const r={at:new Date().toISOString(),site,physicalIPhone:false,scope:'Official matching GitHub Actions container desktop WebKit, real public original AAC and native close/reopen. No post-generation speech review.',cycles:[],consoleErrors:[],lifecycle:[],pass:false};let browser;
try{
 browser=await webkit.launch();r.version=browser.version();const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=async()=>{const p=await context.newPage();p.on('console',m=>{if(m.type()==='error')r.consoleErrors.push(m.text());if(m.text().startsWith('progress-life '))r.lifecycle.push(m.text());});p.on('pageerror',e=>r.consoleErrors.push(e.message));await p.addInitScript(k=>{window.__progressAtStartup=localStorage.getItem(k);for(const ev of ['pagehide','visibilitychange'])window.addEventListener(ev,()=>{const a=document.querySelector('audio');console.log('progress-life '+JSON.stringify({event:ev,hidden:document.hidden,time:a?.currentTime,ready:a?.readyState,paused:a?.paused,stored:localStorage.getItem(k)}));});},key);await p.goto(site+'#book/'+b.bookId,{waitUntil:'domcontentloaded'});await p.locator('#book-title').waitFor();return p;};
 const snap=p=>p.evaluate(k=>{const a=document.querySelector('audio');return{native:{src:a.currentSrc,time:a.currentTime,paused:a.paused,ready:a.readyState,seeking:a.seeking,error:a.error?.code},stored:localStorage.getItem(k),startup:window.__progressAtStartup,status:document.querySelector('#status').textContent};},key);
 const ready=p=>p.waitForFunction(()=>document.querySelector('audio').readyState>=2,{},{timeout:60000});
 let p=await page();r.warmAudio=0;
 for(const book of books){await p.goto(site+'#book/'+book.bookId,{waitUntil:'domcontentloaded'});await p.waitForFunction(t=>document.querySelector('#book-title')?.textContent===t,book.title);for(const chapter of book.chapters.slice(0,2)){r.warmChapter=chapter.chapterId;await p.locator('[data-play="'+chapter.chapterId+'"]').click();await p.waitForFunction(u=>{const a=document.querySelector('audio');return a.currentSrc.replace(/[?]dr_retry=[12]-[a-z0-9-]+$/,'')===u&&a.readyState>=2&&!a.error&&!a.paused&&a.currentTime>.3;},chapter.audioUrl,{timeout:60000});await p.getByRole('button',{name:'暫停',exact:true}).click();r.warmAudio++;}}
 await p.goto(site+'#book/'+b.bookId,{waitUntil:'domcontentloaded'});await p.waitForFunction(t=>document.querySelector('#book-title')?.textContent===t,b.title);
 for(let cycle=0;cycle<5;cycle++){
  const row={cycle,chapterId:ch.chapterId,target:Math.floor(ch.durationSec*.55)};r.cycles.push(row);
  await p.locator('[data-play="'+ch.chapterId+'"]').click();await p.waitForFunction(()=>{const a=document.querySelector('audio');return a.readyState>=2&&!a.paused&&a.currentTime>.2;},{},{timeout:60000});await p.getByRole('button',{name:'暫停',exact:true}).click();
  await p.getByRole('button',{name:'1.5 倍',exact:true}).click();await p.locator('audio').evaluate((a,t)=>a.currentTime=t,row.target);await p.waitForFunction(t=>{const a=document.querySelector('audio');return !a.seeking&&Math.abs(a.currentTime-t)<1;},row.target,{timeout:45000});
  await p.getByRole('button',{name:'播放',exact:true}).click();await p.waitForFunction(t=>document.querySelector('audio').currentTime>t+.3,row.target,{timeout:45000});await p.getByRole('button',{name:'暫停',exact:true}).click();
  await p.reload({waitUntil:'domcontentloaded'});await ready(p);await p.getByRole('button',{name:'播放',exact:true}).click();await p.waitForFunction(t=>{const a=document.querySelector('audio');return !a.seeking&&a.currentTime>t+.3&&a.currentTime<t+15;},row.target,{timeout:45000});await p.getByRole('button',{name:'暫停',exact:true}).click();
  row.beforeClose=await snap(p);row.expected=row.beforeClose.native.time;await p.close();p=await page();await ready(p);row.afterReady=await snap(p);
  await p.getByRole('button',{name:'播放',exact:true}).click();
  try{await p.waitForFunction(t=>{const a=document.querySelector('audio');return !a.error&&!a.seeking&&!a.paused&&a.currentTime>t+.3&&a.currentTime<t+15;},row.expected,{timeout:45000});row.pass=true;}catch(e){row.afterFailure=await snap(p);throw e;}
  await p.getByRole('button',{name:'暫停',exact:true}).click();row.afterPlay=await snap(p);fs.writeFileSync(day+'/webkit-reopen-probe.json',JSON.stringify(r,null,2));
 }
 assert.equal(r.consoleErrors.length,0);r.pass=true;
}catch(e){r.failure=e.message;}finally{if(browser)await browser.close();fs.writeFileSync(day+'/webkit-reopen-probe.json',JSON.stringify(r,null,2));}
console.log(JSON.stringify({pass:r.pass,cycles:r.cycles.map(c=>({cycle:c.cycle,pass:c.pass,target:c.target,afterReady:c.afterReady?.native,afterFailure:c.afterFailure?.native})),failure:r.failure}));if(!r.pass)process.exitCode=1;
