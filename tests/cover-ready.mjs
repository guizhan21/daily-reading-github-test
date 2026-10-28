// Exhaustive image checks freeze native lazy eligibility before changing the
// viewport or replacing the grid. A Linux Firefox trace recorded a native lazy
// request abort during reflow, before DOM removal; don't race exhaustive decode
// assertions against changing lazy eligibility. The native internal cause is
// not established by this synchronization.
// Only the test fixture's loading hint changes: original URLs/bytes, native
// decoding and all console/network failure checks remain required. No retry.
export async function settleShelfCovers(page){
 const images=page.locator('#book-select img'),decoded=[];
 await images.evaluateAll(images=>{for(const image of images)image.loading='eager';});
 for(let index=0;index<await images.count();index++){
  const image=images.nth(index);
  decoded.push(await image.evaluate(async image=>{
   let timer;try{await Promise.race([image.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Cover native decode timed out')),45000);})]);}finally{clearTimeout(timer);}
   if(!image.complete||image.naturalWidth<=0||image.naturalHeight<=0)throw Error('Cover has no decoded pixels');
   return {url:image.currentSrc,width:image.naturalWidth,height:image.naturalHeight};
  }));
 }
 await page.evaluate(()=>scrollTo(0,0));return decoded;
}
