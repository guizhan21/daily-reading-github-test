import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';
import {root,load} from '../scripts/catalog.mjs';
const site=process.env.SITE_URL||'https://guizhan21.github.io/daily-reading-github-test/';
const selected=process.env.BROWSER||'all';
const results=[];
const engines={chrome:[chromium,process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{channel:'chrome'}],chromium:[chromium,{}],firefox:[firefox,{}],webkit:[webkit,{}]};
const output=path.join(root,'test-results');fs.mkdirSync(output,{recursive:true});
for(const [name,[engine,options]] of Object.entries(engines)){
  if(selected!=='all'&&selected!==name)continue;
  const result={browser:name,site,at:new Date().toISOString(),checks:[],mediaResponses:[],errors:[],downloads:[],iPhonePhysical:false};
  const check=(name,data={})=>{result.checks.push({name,pass:true,...data});console.log(`${result.browser}: PASS ${name}`);};
  let browser;
  try{
    browser=await engine.launch({headless:true,...options});result.version=browser.version();
    const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
    page.on('pageerror',e=>result.errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
    page.on('download',d=>result.downloads.push(d.suggestedFilename()));
    page.on('response',async response=>{if(/release-assets\.githubusercontent\.com|github\.com\/.*\/releases\/download\//.test(response.url())){const h=await response.allHeaders();result.mediaResponses.push({origin:new URL(response.url()).origin,status:response.status(),requestRange:response.request().headers()['range']||null,contentType:h['content-type'],contentRange:h['content-range']||null,acceptRanges:h['accept-ranges']||null,disposition:h['content-disposition']||null});}});
    await page.goto(site,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>document.querySelector('audio')?.readyState>=1,{},{timeout:60000});
    assert.equal(await page.locator('#book-title').innerText(),load('data/books.json').books[0].title);
    result.coverLoaded=await page.locator('#cover').evaluate(e=>e.complete&&e.naturalWidth>0);
    assert.ok((await page.locator('article:not([hidden])').innerText()).length>2000);check('book, original Markdown and subpath assets');
    const duration=await page.locator('audio').evaluate(a=>a.duration);assert.ok(duration>300);check('chapter 1 metadata',{duration});
    await page.getByRole('button',{name:'播放',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('audio').currentTime>1,{},{timeout:45000});check('actual playback time advances');
    await page.getByRole('button',{name:'暫停',exact:true}).click();const paused=await page.locator('audio').evaluate(a=>({paused:a.paused,time:a.currentTime}));assert.ok(paused.paused);check('pause');
    await page.getByRole('button',{name:'1.5 倍',exact:true}).click();assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1.5);check('playback rate 1.5x');
    // Real pointer interaction with the visible range control, not just assigning currentTime.
    const box=await page.getByLabel('播放進度',{exact:true}).boundingBox();assert.ok(box);
    await page.mouse.move(box.x+box.width*.08,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.55,box.y+box.height/2,{steps:8});await page.mouse.up();
    await page.waitForFunction(()=>{const a=document.querySelector('audio');return a.currentTime>150&&!a.seeking;},{},{timeout:45000});
    const target=await page.locator('audio').evaluate(a=>a.currentTime);check('pointer seek into middle',{positionSec:target});
    await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForFunction(t=>document.querySelector('audio').currentTime>t+1,target,{timeout:45000});check('playback after middle seek');
    await page.getByRole('button',{name:'暫停',exact:true}).click();const saved=await page.locator('audio').evaluate(a=>a.currentTime);
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('audio')?.readyState>=1,{},{timeout:60000});
    await page.waitForFunction(t=>Math.abs(document.querySelector('audio').currentTime-t)<2,saved,{timeout:30000});assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1.5);check('refresh restores position and speed');
    // A new tab in the same browser context represents closing/reopening the page on this device.
    const reopened=await context.newPage();await reopened.goto(site,{waitUntil:'domcontentloaded'});
    await reopened.waitForFunction(t=>{const a=document.querySelector('audio');return a?.readyState>=1&&Math.abs(a.currentTime-t)<2;},saved,{timeout:60000});check('reopen restores same-device progress');await reopened.close();
    await page.getByRole('button',{name:'下一章',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return a?.duration>380&&a.currentTime>1;},{},{timeout:60000});check('chapter 2 switch and actual playback');
    await page.getByRole('button',{name:'暫停',exact:true}).click();
    await page.getByLabel('播放進度',{exact:true}).focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>document.querySelector('audio').currentTime<2,{},{timeout:20000});check('intentional backward seek');
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('audio')?.duration>380,{},{timeout:60000});check('selected chapter persists on refresh');
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,`${name}-mobile.png`)});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));check('390px responsive layout (not physical iPhone)');
    assert.equal(result.downloads.length,0);check('audio element does not trigger attachment download');
    assert.equal(result.errors.filter(e=>!e.includes('404')).length,0);check('no page, CSP or CORS errors');
    assert.ok(result.coverLoaded,'Original cover has not yet been recovered');check('original cover loaded');
    result.pass=true;
  }catch(e){result.pass=false;result.failure=e.message;console.log(`${name}: FAIL ${e.message}`);}
  finally{if(browser)await browser.close();results.push(result);fs.writeFileSync(path.join(output,`${name}.json`),JSON.stringify(result,null,2));}
}
fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(results,null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
