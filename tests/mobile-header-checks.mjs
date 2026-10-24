import assert from 'node:assert/strict';
import path from 'node:path';

export async function mobileHeaderChecks(browser,site,books,check,observe,{screenshots,browserName}={}){
 const context=await browser.newContext({viewport:{width:393,height:852},colorScheme:'light',hasTouch:true,...(browser.browserType().name()==='chromium'?{isMobile:true}:{})}),page=await context.newPage();observe(page);
 const book=books.find(b=>b.title==='科學如何建立可靠知識')||books[0];
 try{
  await page.goto(site+'#book/'+book.bookId);await page.locator('#book-title').waitFor();
  for(const width of [360,390,393,430,560]){
   await page.setViewportSize({width,height:852});assert.equal(await page.locator('#theme-toggle').isVisible(),false,`Leaked desktop theme control at ${width}px`);
   assert.equal(await page.locator('#appearance-settings>summary').isVisible(),false);
   assert.equal(await page.locator('.topbar').evaluate(e=>e.getBoundingClientRect().height),0);
   const back=await page.locator('.back-link').evaluate(e=>{const r=e.getBoundingClientRect();return {inside:r.left>=0&&r.right<=innerWidth&&r.top>=0,uncovered:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});assert.equal(back.inside,true);assert.equal(back.uncovered,true);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  check('mobile book header has no leaked desktop theme control or obscured back link at five widths');
  await page.setViewportSize({width:393,height:852});await page.locator('audio').evaluate(a=>{window.__headerAudio=a;a.dataset.headerLoads='0';a.addEventListener('loadstart',()=>a.dataset.headerLoads=String(Number(a.dataset.headerLoads)+1));});
  for(const label of ['森間書架皮膚','星夜像素皮膚','海岸聲音皮膚']){
   await page.locator('#dock-settings').click();await page.getByRole('button',{name:label,exact:true}).click();
   await page.getByRole('button',{name:'夜晚模式',exact:true}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.getByRole('button',{name:'白天模式',exact:true}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
   const panel=await page.locator('.appearance-panel').boundingBox();assert.ok(panel.x>=0&&panel.x+panel.width<=393&&panel.y>=0&&panel.y+panel.height<=852);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#appearance-settings').getAttribute('open'),null);assert.equal(await page.locator('#theme-toggle').isVisible(),false);assert.equal(await page.locator('#dock-settings').evaluate(e=>document.activeElement===e),true);
  }
  assert.equal(await page.locator('audio').getAttribute('data-header-loads'),'0');assert.ok(await page.evaluate(()=>window.__headerAudio===document.querySelector('audio')));
  check('mobile dock still opens all skin and theme settings without replacing or reloading audio');
  if(screenshots&&browser.browserType().name()!=='webkit'){
   await page.locator('#dock-settings').blur();await page.waitForTimeout(450);await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('.cover-large img')?.decode();});await page.screenshot({caret:'initial',path:path.join(screenshots,browserName+'-book-header.png')});
  }
  for(const width of [561,768,1280]){
   await page.setViewportSize({width,height:900});assert.equal(await page.locator('#theme-toggle').isVisible(),true);
   const contained=await page.locator('#theme-toggle').evaluate(e=>{const r=e.getBoundingClientRect(),h=e.closest('.topbar').getBoundingClientRect();return r.y>=h.y&&r.bottom<=h.bottom;});assert.equal(contained,true);
   await page.locator('#theme-toggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.locator('#theme-toggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  }
  check('desktop theme shortcut remains visible, inside its header and functional above the mobile breakpoint');
 }finally{await context.close();}
}
