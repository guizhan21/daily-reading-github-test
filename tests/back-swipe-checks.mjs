import assert from 'node:assert/strict';

export async function backSwipeChecks(browser,site,books,check,observe){
 const native=browser.browserType().name()==='chromium';
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce',...(native?{isMobile:true}:{})}),page=await context.newPage();observe(page);
 const b=books[0],ch=b.chapters[0];let cdp;
 const method=native?'Chromium native CDP touch sequence':'synthetic DOM TouchEvent binding; not physical iPhone';
 async function swipe(selector,{dy=0,duration=160,dx=-150}={}){
  const target=page.locator(selector).first();await target.scrollIntoViewIfNeeded();const r=await target.boundingBox();assert.ok(r);
  const x=Math.min(350,r.x+r.width-10),y=Math.max(30,Math.min(770,r.y+r.height/2));
  if(native){
   cdp||=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=4;i++){await page.waitForTimeout(duration/4);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/4,y:y+dy*i/4}]});}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   await target.evaluate((e,p)=>{window.__gestureTarget=e;window.__gesturePoint=p;const touch={identifier:41,clientX:p.x,clientY:p.y},event=new Event('touchstart',{bubbles:true,cancelable:true});Object.defineProperties(event,{touches:{value:[touch]},changedTouches:{value:[touch]}});e.dispatchEvent(event);},{x,y});
   await page.waitForTimeout(duration);
   await page.evaluate(p=>{const touch={identifier:41,clientX:window.__gesturePoint.x+p.dx,clientY:window.__gesturePoint.y+p.dy},e=new Event('touchend',{bubbles:true,cancelable:true});Object.defineProperties(e,{touches:{value:[]},changedTouches:{value:[touch]}});window.__gestureTarget.dispatchEvent(e);delete window.__gestureTarget;delete window.__gesturePoint;},{dx,dy});
  }
  await page.waitForTimeout(80);
 }
 try{
  await page.goto(site+'#book/'+b.bookId,{waitUntil:'domcontentloaded'});await page.locator('#book-title').waitFor();
  await page.locator('[data-play="'+ch.chapterId+'"]').click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return !a.paused&&a.currentTime>.3&&!a.error;},{},{timeout:60000});await page.getByRole('button',{name:'暫停',exact:true}).click();
  await page.locator('audio').evaluate(a=>{window.__swipeAudio=a;window.__swipeSource=a.currentSrc;window.__swipeLoads=0;a.addEventListener('loadstart',()=>window.__swipeLoads++);});
  await page.locator('#player-cover').click();await page.locator('#player-queue-toggle').click();
  await swipe('#player-queue button');assert.equal(await page.locator('#player-queue').isHidden(),true);assert.equal(await page.locator('.player').getAttribute('data-expanded'),'true');check('left swipe starting on a chapter button closes only the queue',{method});
  assert.equal(await page.locator('[data-play="'+ch.chapterId+'"]').getAttribute('aria-current'),'true');assert.ok(await page.locator('audio').evaluate(a=>a.paused));check('recognized button swipe does not activate the chapter beneath the finger');
  await page.locator('#rate-picker summary').click();await swipe('#rate button[data-rate="2"]');assert.equal(await page.locator('#rate-picker').getAttribute('open'),null);assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1);assert.equal(await page.locator('.player').getAttribute('data-expanded'),'true');check('left swipe on speed buttons closes the popover without changing rate');
  await swipe('#rate-picker summary');assert.equal(await page.locator('.player').getAttribute('data-expanded'),'false');check('left swipe starting on a closed summary collapses the player');
  await page.locator('#player-cover').click();await swipe('.player-art',{duration:32});assert.equal(await page.locator('.player').getAttribute('data-expanded'),'false');check('a fast deliberate cover swipe returns instead of silently sticking',{method});
  await page.locator('#player-cover').click();await swipe('.player-art',{dx:150});assert.equal(await page.locator('.player').getAttribute('data-expanded'),'true');await swipe('.player-art',{dx:-20,dy:-110});assert.equal(await page.locator('.player').getAttribute('data-expanded'),'true');check('rightward and vertical touch gestures keep the current view');
  const range=await page.locator('#seek').boundingBox();if(native){await swipe('#seek',{dx:-120});}else{await swipe('#seek');}assert.ok(range);assert.equal(await page.locator('.player').getAttribute('data-expanded'),'true');check('audio range input retains ownership of horizontal scrubbing');
  await page.locator('#collapse-player').click();await page.locator('[data-read="'+ch.chapterId+'"]').click();await page.locator('#reader-content article').waitFor();
  // A real link is the surface the reader touches; no production DOM changes.
  await swipe('#markdown-download');assert.equal(await page.locator('body').getAttribute('data-reading-open'),'false');check('left swipe beginning on the Markdown link returns to the book without a download');
  await page.evaluate(()=>scrollTo(0,0));await swipe('.book-intro');await page.locator('#search-input').waitFor();assert.ok((await page.evaluate(()=>location.hash)).startsWith('#library/'));check('consecutive swipes return player, reader and book one level at a time');
  assert.ok(await page.evaluate(()=>window.__swipeAudio===document.querySelector('audio')&&window.__swipeSource===document.querySelector('audio').currentSrc));assert.equal(await page.evaluate(()=>window.__swipeLoads),0);check('all swipe navigation retains the same audio element and stream with zero reloads');
  // The next intentional tap must not be swallowed by the compatibility-click guard.
  await page.locator('.book-card').first().tap();await page.locator('#book-title').waitFor();check('the next deliberate touch tap still opens a book after swipe navigation');
 }finally{await context.close();}
}
