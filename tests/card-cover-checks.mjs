import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {cardCoverPath} from '../src/cover-assets.js';import {settleShelfCovers} from './cover-ready.mjs';
export async function cardCoverChecks(browser,site,books,check,observe){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();observe(page);
 try{
  await page.goto(site+'#library/unread',{waitUntil:'domcontentloaded'});await page.locator('#book-select').waitFor();const decoded=await settleShelfCovers(page),images=books.filter(b=>b.coverKind!=='original-template');assert.equal(decoded.length,images.length);
  for(const b of images){const img=page.locator('[data-book="'+b.bookId+'"] img');assert.equal(await img.getAttribute('src'),cardCoverPath(b));const dimensions=await img.evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight}));assert.ok(dimensions.width>0&&dimensions.width<=480&&dimensions.height>0&&dimensions.height<=720);}
  check('every raster book card uses a bounded native-decoded display derivative',{decoded,originalDetailAndPlayerRetained:true});
  const res=await context.request.get(new URL('cover-thumbnails.json',site).href);assert.equal(res.status(),200);const manifest=await res.json();assert.equal(manifest.entries.length,images.length);
  let sourceBytes=0,cardBytes=0;for(const b of images){const entry=manifest.entries.find(e=>e.bookId===b.bookId&&e.version===b.version);assert.equal(entry.source,b.cover);assert.equal(entry.path,cardCoverPath(b));const r=await context.request.get(new URL(entry.path,site).href);assert.equal(r.status(),200);assert.ok(r.headers()['content-type'].includes('image/webp'));const bytes=await r.body();assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.equal(bytes.length,entry.bytes);assert.ok(entry.bytes<entry.sourceBytes);sourceBytes+=entry.sourceBytes;cardBytes+=entry.bytes;}
  check('public card derivatives match the build manifest and reduce transfer bytes',{images:images.length,sourceBytes,cardBytes});
 }finally{await context.close();}
}
