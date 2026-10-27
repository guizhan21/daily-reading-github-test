// Visual/filter checks must finish decoding the actual lazy-loaded covers before
// replacing their DOM. This adds real image verification; it does not classify
// or suppress any Firefox console/network error.
export async function settleShelfCovers(page){
 const images=page.locator('#book-select img'),decoded=[];
 for(let index=0;index<await images.count();index++){
  const image=images.nth(index);await image.scrollIntoViewIfNeeded();
  decoded.push(await image.evaluate(async image=>{
   let timer;try{await Promise.race([image.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Cover native decode timed out')),45000);})]);}finally{clearTimeout(timer);}
   if(!image.complete||image.naturalWidth<=0||image.naturalHeight<=0)throw Error('Cover has no decoded pixels');
   return {url:image.currentSrc,width:image.naturalWidth,height:image.naturalHeight};
  }));
 }
 await page.evaluate(()=>scrollTo(0,0));return decoded;
}
