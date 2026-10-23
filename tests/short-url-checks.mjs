import assert from 'node:assert/strict';
export async function shortURLChecks(browser,site,books,check,observe){
 const url=new URL(site);if(url.origin!=='https://guizhan21.github.io'||url.pathname!=='/')return;
 const b=books[0],ch=b.chapters[1],position=73.25,rate=1.5;
 const context=await browser.newContext();
 await context.addInitScript(({b,ch,position,rate})=>{if(!localStorage.getItem('daily-reading-github:v1'))localStorage.setItem('daily-reading-github:v1',JSON.stringify({schema:1,activeBook:b.bookId,books:{[b.bookId]:{started:true,activeChapter:ch.chapterId,chapters:{[ch.chapterId]:{positionSec:position,rate}}}}}));},{b,ch,position,rate});
 const p=await context.newPage();observe(p);
 try{
  await p.goto(url.origin+'/daily-reading-github-test/#book/'+b.bookId,{waitUntil:'domcontentloaded'});await p.locator('#book-title').waitFor();
  const restored=()=>p.waitForFunction(({url,position,rate})=>{const a=document.querySelector('audio');return a.currentSrc===url&&a.readyState>=1&&!a.seeking&&Math.abs(a.currentTime-position)<.5&&a.playbackRate===rate;},{url:ch.audioUrl,position,rate},{timeout:60000});
  await restored();await p.goto(site+'#book/'+b.bookId,{waitUntil:'domcontentloaded'});await restored();
  const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('daily-reading-github:v1')));assert.equal(saved.books[b.bookId].activeChapter,ch.chapterId);assert.ok(Math.abs(saved.books[b.bookId].chapters[ch.chapterId].positionSec-position)<.5);check('short and legacy URLs share the existing browser chapter position and speed');
 }catch(e){try{e.message+='; media='+JSON.stringify(await p.locator('audio').evaluate(a=>({src:a.currentSrc,time:a.currentTime,seeking:a.seeking,readyState:a.readyState,error:a.error?.message})));}catch{}throw e;}finally{await context.close();}
}
