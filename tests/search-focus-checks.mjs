import assert from 'node:assert/strict';
import path from 'node:path';
import {settleShelfCovers} from './cover-ready.mjs';

// These are native desktop-engine focus/layout tests, not an iPhone keyboard
// test. A >=16px input prevents the small-font trigger for iOS focus zoom;
// viewport resizing below only exercises the reduced space of a keyboard.
export async function searchFocusChecks(browser,site,books,check,observe,{screenshots,browserName}={}){
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,colorScheme:'light',...(browser.browserType().name()==='chromium'?{isMobile:true}:{})});
 const page=await context.newPage();observe(page);
 async function geometry(){return page.locator('#search-input').evaluate(input=>{
  const form=input.form,r=form.getBoundingClientRect(),i=input.getBoundingClientRect(),c=getComputedStyle(input),f=getComputedStyle(form);
  return {fontSize:parseFloat(c.fontSize),appearance:c.appearance,innerOutline:c.outlineStyle,innerBorder:parseFloat(c.borderTopWidth),innerShadow:c.boxShadow,outerOutline:f.outlineStyle,outerOutlineWidth:parseFloat(f.outlineWidth),focused:document.activeElement===input,form:{x:r.x,y:r.y,width:r.width,height:r.height},input:{x:i.x,y:i.y,width:i.width,height:i.height},width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scale:visualViewport?.scale||1,tabs:[...document.querySelectorAll('.shelf-tabs a')].map(a=>{const t=a.getBoundingClientRect();return {left:t.left,right:t.right};})};
 });}
 function contained(g){
  assert.ok(g.form.x>=0&&g.form.x+g.form.width<=g.width,g);
  assert.ok(g.input.x>=g.form.x&&g.input.x+g.input.width<=g.form.x+g.form.width+1,g);
  assert.ok(Math.abs(g.input.y+g.input.height/2-g.form.y-g.form.height/2)<1,g);
  assert.ok(g.scrollWidth<=g.width+1,g);
  for(const t of g.tabs)assert.ok(t.left>=0&&t.right<=g.width+1,g);
 }
 try{
  await page.goto(site+'#library/unread');await page.locator('#search-input').waitFor();
  const coverDecodes=await settleShelfCovers(page);
  const viewport=await page.locator('meta[name="viewport"]').getAttribute('content');
  assert.ok(!/user-scalable\s*=\s*(no|0)|maximum-scale\s*=/.test(viewport),viewport);
  const sizes=[];
  for(const width of [360,390,393,430,768]){
   await page.setViewportSize({width,height:844});await page.locator('#search-input').blur();const before=await geometry();
   await page.locator('#search-input').click();const g=await geometry();contained(g);
   assert.ok(g.fontSize>=16,`Search is ${g.fontSize}px at ${width}px; iOS small-input focus zoom risk`);
   assert.equal(g.appearance,'none');assert.equal(g.focused,true);assert.equal(g.innerOutline,'none');assert.equal(g.innerBorder,0);assert.equal(g.innerShadow,'none');
   assert.equal(g.outerOutline,'solid');assert.ok(g.outerOutlineWidth>=2);assert.equal(g.scale,before.scale);assert.equal(g.form.width,before.form.width);sizes.push({viewport:width,...g});
  }
  check('focused search uses >=16px text and one outer focus frame at five viewport widths',{sizes,coverDecodes,iPhonePhysical:false});
  check('normal pinch zoom remains enabled in the viewport metadata');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#search-input').fill(books.at(-1).title);assert.equal(await page.locator('#book-select [data-book]').count(),1);
  await page.locator('#search-input').fill('不存在書籍XYZ');assert.equal(await page.locator('#book-select [data-book]').count(),0);
  await page.locator('#search-input').fill('');assert.equal(await page.locator('#book-select [data-book]').count(),books.length);
  await page.locator('#search-input').fill('AI');await page.locator('#search-input').press('Enter');await page.waitForFunction(()=>location.hash.includes('q=AI'));
  assert.equal(await page.locator('#search-input').inputValue(),'AI');await page.reload();assert.equal(await page.locator('#search-input').inputValue(),'AI');
  check('search filters Chinese titles, clears, submits and survives refresh');
  await page.locator('#search-input').fill('');await page.locator('#search-input').focus();await page.setViewportSize({width:390,height:430});const reduced=await geometry();contained(reduced);assert.equal(reduced.focused,true);
  check('focused search and all three shelf tabs fit a reduced-height viewport',{geometry:reduced,keyboard:'viewport resize only; no physical iPhone keyboard'});
  await page.setViewportSize({width:390,height:844});
  for(const label of ['森間書架皮膚','星夜像素皮膚','海岸聲音皮膚']){
   await page.locator('#dock-settings').click();await page.getByRole('button',{name:label,exact:true}).click();await page.keyboard.press('Escape');await page.locator('#search-input').focus();const g=await geometry();contained(g);assert.ok(g.fontSize>=16);assert.equal(g.innerOutline,'none');assert.equal(g.outerOutline,'solid');
  }
  await page.locator('.masthead-brand').focus();await page.keyboard.press('Tab');const keyboard=await geometry();assert.equal(keyboard.focused,true);assert.equal(keyboard.outerOutline,'solid');
  check('search focus remains visible in all three skins and for keyboard use');
  if(screenshots&&browser.browserType().name()!=='webkit'){
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0&&r.width>0;}).map(i=>i.decode()));const url=getComputedStyle(document.documentElement).getPropertyValue('--reference-image').trim().slice(4,-1).replace(/^['"]|['"]$/g,'');const image=new Image();image.src=url;await image.decode();});
   await page.screenshot({caret:'initial',path:path.join(screenshots,browserName+'-focused-search.png')});
  }
 }finally{await context.close();}
}
