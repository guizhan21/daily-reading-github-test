import assert from 'node:assert/strict';
export async function shortURLChecks(browser,site,books,check,observe){
 const url=new URL(site);if(url.origin!=='https://guizhan21.github.io'||url.pathname!=='/')return;
 const b=books[0],ch=b.chapters[1],position=73.25,rate=1.5;
 const context=await browser.newContext();
 await context.addInitScript(({b,ch,position,rate})=>{if(!localStorage.getItem('daily-reading-github:v1'))localStorage.setItem('daily-reading-github:v1',JSON.stringify({schema:1,activeBook:b.bookId,books:{[b.bookId]:{started:true,activeChapter:ch.chapterId,chapters:{[ch.chapterId]:{positionSec:position,rate}}}}}));},{b,ch,position,rate});
 const p=await context.newPage();observe(p);
 try{
  const openBook=async target=>{
   await p.goto(target,{waitUntil:'domcontentloaded'});await p.locator('#book-title').waitFor();
   // Let the actual cover finish native decode before replacing the document.
   // A cancellation here must not masquerade as a corrupt public cover.
   if(b.coverKind!=='original-template'){
    const image=p.locator('img#cover');
    const result=await image.evaluate(async el=>{
     el.loading='eager';let timer;
     try{await Promise.race([el.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Cross-URL book cover did not decode')),45000);})]);}
     finally{clearTimeout(timer);}
     return {url:el.currentSrc,width:el.naturalWidth,height:el.naturalHeight};
    });
    assert.equal(result.url,new URL(b.cover,target).href);assert(result.width>0&&result.height>0);
   }
  };
  await openBook(url.origin+'/daily-reading-github-test/#book/'+b.bookId);
  const restored=()=>p.waitForFunction(({url,position,rate})=>{const a=document.querySelector('audio');return a.currentSrc.replace(/[?]dr_retry=[12]-[a-z0-9-]+$/,'')===url&&a.readyState>=1&&!a.seeking&&Math.abs(a.currentTime-position)<.5&&a.playbackRate===rate;},{url:ch.audioUrl,position,rate},{timeout:60000});
  await restored();await openBook(site+'#book/'+b.bookId);await restored();
  const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('daily-reading-github:v1')));assert.equal(saved.books[b.bookId].activeChapter,ch.chapterId);assert.ok(Math.abs(saved.books[b.bookId].chapters[ch.chapterId].positionSec-position)<.5);check('short and legacy URLs share the existing browser chapter position and speed');
 }catch(e){try{e.message+='; media='+JSON.stringify(await p.locator('audio').evaluate(a=>({src:a.currentSrc,time:a.currentTime,seeking:a.seeking,readyState:a.readyState,error:a.error?.message})));}catch{}throw e;}finally{await context.close();}
}
