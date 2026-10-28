// Isolated diagnostic: real public PNG requests, native decoding, no retries,
// response interception, error exemptions, audio or deployment.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {firefox} from 'playwright';
import {settleShelfCovers} from './cover-ready.mjs';
const site='https://guizhan21.github.io/daily-reading-github-test/';
fs.mkdirSync('test-results',{recursive:true});
const browser=await firefox.launch(),report={version:browser.version(),platform:process.platform,site,rows:[]};
try{
 for(let iteration=0;iteration<12;iteration++){
  const scenario=iteration%2?'focus':'shelf',row={iteration,scenario,events:[]},pending=[];
  const context=await browser.newContext({viewport:scenario==='shelf'?{width:1280,height:900}:{width:390,height:844}});
  await context.tracing.start({screenshots:true,snapshots:true});
  await context.exposeBinding('coverDiagnostic',(_,event)=>row.events.push(event));
  await context.addInitScript(()=>{
   const emit=event=>window.coverDiagnostic({...event,at:Date.now()});
   document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement)emit({kind:'native-error',url:e.target.src,complete:e.target.complete,width:e.target.naturalWidth,connected:e.target.isConnected,visible:document.visibilityState});},true);
   new MutationObserver(ms=>{for(const m of ms)for(const n of m.removedNodes){if(n.nodeType!==1)continue;for(const i of [n,...n.querySelectorAll('img')].filter(n=>n.tagName==='IMG'&&n.src.includes('/covers/')))emit({kind:'removed',url:i.src,complete:i.complete,width:i.naturalWidth});}}).observe(document,{subtree:true,childList:true});
  });
  const page=await context.newPage();
  page.on('framenavigated',f=>{if(f===page.mainFrame())row.events.push({kind:'navigation',at:Date.now(),url:f.url()});});
  page.on('console',m=>{if(m.type()==='error')row.events.push({kind:'console',at:Date.now(),text:m.text()});});
  page.on('request',q=>{if(q.resourceType()==='image')row.events.push({kind:'request',at:Date.now(),url:q.url(),timing:q.timing()});});
  page.on('requestfailed',q=>{if(q.resourceType()==='image')row.events.push({kind:'failed',at:Date.now(),url:q.url(),error:q.failure(),timing:q.timing()});});
  page.on('requestfinished',q=>{if(q.resourceType()==='image')pending.push((async()=>{const r=await q.response(),h=await r.allHeaders(),body=await r.body();row.events.push({kind:'finished',at:Date.now(),url:q.url(),status:r.status(),headers:h,bytes:body.length,sha256:crypto.createHash('sha256').update(body).digest('hex'),timing:q.timing()});})().catch(e=>row.events.push({kind:'body-error',url:q.url(),text:e.message})));});
  try{
   await page.goto(site+(scenario==='shelf'?'#home':'#library/unread'),{waitUntil:'domcontentloaded'});
   if(scenario==='shelf'){
    await page.locator('.shelf-portals').waitFor();await page.locator('.sidebar nav a[href="#library/unread"]').click();await page.locator('#book-select[data-shelf="unread"]').waitFor();row.decoded=await settleShelfCovers(page);
   }else{
    await page.locator('#search-input').waitFor();row.initialDecodes=await settleShelfCovers(page);
    for(const width of [360,390,393,430,768]){await page.setViewportSize({width,height:844});await page.locator('#search-input').blur();await page.locator('#search-input').click();}
    await page.setViewportSize({width:390,height:844});await page.locator('#search-input').fill('AI');await page.locator('#search-input').fill('');row.decoded=await settleShelfCovers(page);
   }
  }catch(e){row.failure=e.message;await page.screenshot({path:`test-results/diagnostic-${iteration}.png`}).catch(()=>{});}
  await Promise.allSettled(pending);const bad=row.failure||row.events.some(e=>['failed','console','native-error'].includes(e.kind));await context.tracing.stop(bad?{path:`test-results/diagnostic-${iteration}.zip`}:{});await context.close();report.rows.push(row);
  fs.writeFileSync('test-results/cover-diagnostic.json',JSON.stringify(report,null,2));console.log(JSON.stringify({iteration,scenario,failure:row.failure,decoded:row.decoded?.length,errors:row.events.filter(e=>['failed','console','native-error'].includes(e.kind))}));
 }
}finally{await browser.close();}
if(report.rows.some(r=>r.failure||r.events.some(e=>['failed','console','native-error'].includes(e.kind))))process.exitCode=1;
