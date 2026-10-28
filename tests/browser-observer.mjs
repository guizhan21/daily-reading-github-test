import {cardCoverPath} from '../src/cover-assets.js';
// Firefox also emits a decoder-looking console message when navigation aborts
// a valid in-flight image. Keep the native evidence; never ignore by text alone.
export function navigationImageCancellation(error,{browser,knownCovers,failures,navigations}){
 if(browser!=='firefox'||error.type!=='console')return null;
 const url=error.text.match(/^\[JavaScript Error: "Image corrupt or truncated\." \{file: "([^"]+)" line: 0\}\]$/)?.[1];
 if(!url||!knownCovers.has(url))return null;
 for(const request of failures){
  if(request.pageId!==error.pageId||request.url!==url||request.reason!=='NS_BINDING_ABORTED'||Math.abs(request.at-error.at)>100||!Number.isFinite(request.startedAt))continue;
  const navigation=navigations.find(n=>n.pageId===error.pageId&&request.startedAt<=n.at&&n.at<=request.at+100&&request.at-n.at<=500);
  if(navigation)return {text:error.text,pageId:error.pageId,url,consoleAt:error.at,requestStartedAt:request.startedAt,abortedAt:request.at,navigationAt:navigation.at,reason:request.reason};
 }
 return null;
}

export function createBrowserObserver(report,{browser,site,books}){
 const knownCovers=new Set(books.flatMap(b=>[b.cover,cardCoverPath(b)]).map(cover=>new URL(cover,site).href)),failures=[],navigations=[],errors=[],observed=new WeakSet();let pageCounter=0;
 report.imageEvents=[];report.navigationImageCancellations=[];
 function observe(page,{media=true}={}){
  if(observed.has(page))return;observed.add(page);const pageId=++pageCounter,starts=new WeakMap();
  page.on('framenavigated',frame=>{if(frame===page.mainFrame()){const e={pageId,at:Date.now()};navigations.push(e);report.imageEvents.push({type:'navigation',...e});}});
  page.on('close',()=>{const e={pageId,at:Date.now(),kind:'close'};navigations.push(e);report.imageEvents.push({type:'page-close',...e});});
  page.on('request',request=>{if(request.resourceType()==='image')starts.set(request,Date.now());});
  page.on('pageerror',e=>errors.push({type:'pageerror',pageId,at:Date.now(),text:e.message}));
  page.on('console',message=>{
   if(message.type()==='error'){const e={type:'console',pageId,at:Date.now(),text:message.text()};errors.push(e);report.imageEvents.push(e);}
   if(media&&message.text().startsWith('audio-recovery '))report.mediaRecoveries.push(JSON.parse(message.text().slice(15)));
  });
  page.on('requestfailed',request=>{
   if(request.resourceType()==='image'&&knownCovers.has(request.url())){const e={pageId,url:request.url(),at:Date.now(),startedAt:starts.get(request),reason:request.failure()?.errorText};failures.push(e);report.imageEvents.push({type:'image-requestfailed',...e});}
   if(media&&/github.com\/.*releases\/download|release-assets.githubusercontent.com/.test(request.url())){const u=new URL(request.url());report.mediaTransportFailures.push({origin:u.origin,path:u.pathname,reason:request.failure()?.errorText});}
  });
  page.on('download',download=>report.downloads.push(download.suggestedFilename()));
  if(media)page.on('response',async response=>{try{if(/release-assets\.githubusercontent\.com/.test(response.url())){const h=await response.allHeaders();report.mediaResponses.push({origin:new URL(response.url()).origin,status:response.status(),range:h['content-range'],type:h['content-type'],disposition:h['content-disposition']});}}catch{/* The real media checks still fail on a missing or invalid response. */}});
 }
 function refresh(){
  report.errors=[];report.navigationImageCancellations=[];
  for(const error of errors){const cancellation=navigationImageCancellation(error,{browser,knownCovers,failures,navigations});if(cancellation)report.navigationImageCancellations.push(cancellation);else report.errors.push(error.text);}
 }
 return {observe,refresh};
}
