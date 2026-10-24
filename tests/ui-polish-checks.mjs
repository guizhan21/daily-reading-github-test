import assert from 'node:assert/strict';import path from 'node:path';
export async function uiPolishChecks(browser,site,books,check,observe,{screenshots,browserName}={}){
 // WebKit screenshot styling injection is blocked by the production CSP; keep
 // that policy and verify its geometry/interaction without injected screenshot CSS.
 const nativeTouch=browser.browserType().name()==='chromium';
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,colorScheme:'light',...(nativeTouch?{isMobile:true}:{})}),page=await context.newPage();observe(page);
 const b=books[0],ch=b.chapters[0];let cdp;
 async function swipe(x,y,endX,endY=y,selector='body'){
  if(nativeTouch){
   cdp||=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++){await page.waitForTimeout(20);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(endX-x)*i/8,y:y+(endY-y)*i/8}]});}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   // Tests the actual application binding in engines without a native touch
   // injection API. This is explicitly not an iPhone / OS gesture test.
   await page.locator(selector).evaluate((target,p)=>{const dispatch=(type,x,y)=>{const e=new Event(type,{bubbles:true}),touch={clientX:x,clientY:y};Object.defineProperties(e,{touches:{value:type==='touchend'?[]:[touch]},changedTouches:{value:[touch]}});target.dispatchEvent(e);};dispatch('touchstart',p.x,p.y);window.__finishTestSwipe=()=>dispatch('touchend',p.endX,p.endY);},{x,y,endX,endY});
   await page.waitForTimeout(180);await page.evaluate(()=>{window.__finishTestSwipe();delete window.__finishTestSwipe;});
  }
 }
 async function readyImages(){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0&&r.width>0;}).map(i=>i.decode()));const image=new Image();image.src=getComputedStyle(document.documentElement).getPropertyValue('--reference-image').trim().slice(4,-1).replace(/^['"]|['"]$/g,'');await image.decode();});}
 try{
  await page.goto(site);await page.locator('#search-input').waitFor();
  for(const width of [360,390,430,768]){
   await page.setViewportSize({width,height:844});
   const box=await page.locator('#search-form').boundingBox(),input=await page.locator('#search-input').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width);assert.ok(input.x>=box.x&&input.x+input.width<=box.x+box.width+1);assert.ok(Math.abs(input.y+input.height/2-(box.y+box.height/2))<1);
  }check('single live search field stays aligned at 360 / 390 / 430 / 768px');
  await page.setViewportSize({width:390,height:844});await readyImages();
  if(screenshots&&browser.browserType().name()!=='webkit')await page.screenshot({caret:'initial',path:path.join(screenshots,browserName+'-clean-shelf.png')});
  await page.locator('#search-input').fill('AI');assert.ok(await page.locator('.book-card').count()>0);await page.locator('#search-input').fill('');
  await page.goto(site+'#book/'+b.bookId);await page.locator('#book-title').waitFor();
  await page.locator('[data-play="'+ch.chapterId+'"]').click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return !a.paused&&!a.error&&a.currentTime>.3;},{},{timeout:60000});await page.getByRole('button',{name:'暫停',exact:true}).click();
  await page.locator('audio').evaluate(a=>{window.__polishAudio=a;a.dataset.polishLoads='0';a.addEventListener('loadstart',()=>a.dataset.polishLoads=String(Number(a.dataset.polishLoads)+1));});
  await page.locator('#player-cover').click();
  const art=await page.locator('.player').evaluate(e=>{const c=getComputedStyle(e,'::before');return {size:c.backgroundSize,position:c.backgroundPosition,height:c.height,mask:c.maskImage};});const scale=art.size.split(' ').map(parseFloat);assert.ok(Math.abs(scale[0]-361.411765)<.002&&Math.abs(scale[1]-598.830409)<.002,art.size);assert.ok(parseFloat(art.height)<180);assert.ok(art.mask.includes('rgba(0, 0, 0, 0)'),art.mask);assert.equal(await page.locator('#player-cover').getAttribute('src'),b.cover);check('player background samples only the clean sea banner; original book cover is the sole foreground cover',{art});
  for(const [skin,label] of [['coast','海岸聲音皮膚'],['forest','森間書架皮膚'],['pixel','星夜像素皮膚']]){
   if(skin!=='coast'){await page.locator('#collapse-player').click();await page.locator('#dock-settings').click();await page.getByRole('button',{name:label,exact:true}).click();await page.keyboard.press('Escape');await page.locator('#player-cover').click();}
   await readyImages();await page.waitForTimeout(550);if(screenshots&&browser.browserType().name()!=='webkit')await page.screenshot({caret:'initial',path:path.join(screenshots,browserName+'-clean-player-'+skin+'.png')});assert.equal(await page.locator('#player-cover').getAttribute('src'),b.cover);
  }
  await page.locator('#player-queue-toggle').click();await swipe(300,28,90,28,'.player');assert.equal(await page.locator('#player-queue').isHidden(),true);assert.equal(await page.locator('.player').getAttribute('data-expanded'),'true');
  await swipe(320,220,90,220,'.player');assert.equal(await page.locator('.player').getAttribute('data-expanded'),'false');assert.ok(await page.evaluate(()=>window.__polishAudio===document.querySelector('audio')));assert.equal(await page.locator('audio').getAttribute('data-polish-loads'),'0');check('left swipe closes queue then player one level at a time without reloading audio',{touchMethod:nativeTouch?'Chromium native CDP touch':'synthetic DOM TouchEvent binding'});
  await page.locator('[data-read="'+ch.chapterId+'"]').click();await page.locator('#reader-content article').waitFor();
  await swipe(290,490,270,240,'#reader-content');assert.equal(await page.locator('body').getAttribute('data-reading-open'),'true');await page.evaluate(()=>getSelection()?.removeAllRanges());await page.evaluate(()=>scrollTo(0,0));
  await swipe(320,310,90,310,'#reader-content');assert.equal(await page.locator('body').getAttribute('data-reading-open'),'false');await swipe(320,240,90,240,'.book-intro');await page.locator('#search-input').waitFor();assert.ok((await page.evaluate(()=>location.hash)).startsWith('#library/'));check('vertical reader gesture stays in chapter; left swipe returns reader → book → shelf');
  const shelf=await page.evaluate(()=>location.hash);await swipe(320,310,90,310,'#view');assert.equal(await page.evaluate(()=>location.hash),shelf);assert.equal(await page.locator('audio').getAttribute('data-polish-loads'),'0');check('swiping at shelf never navigates outside the library or resets audio');
  await page.locator('#player-cover').click();const seek=await page.locator('#seek').boundingBox();await swipe(seek.x+seek.width*.8,seek.y+seek.height/2,seek.x+seek.width*.2,seek.y+seek.height/2,'#seek');assert.equal(await page.locator('.player').getAttribute('data-expanded'),'true');check('horizontal progress scrub retains control ownership and does not trigger back');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }finally{await context.close();}
}
