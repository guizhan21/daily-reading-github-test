import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,load,hash} from './catalog.mjs';
import {probeRequest} from './probe-transport.mjs';
const results=[],allBooks=load('data/books.json').books;
const requested=new Set((process.env.BOOK_IDS||'').split(',').filter(Boolean));
for(const id of requested)if(!allBooks.some(b=>b.bookId===id))throw Error('Unknown probe book: '+id);
const selectedBooks=requested.size?allBooks.filter(b=>requested.has(b.bookId)):allBooks;
const reportName=process.env.HTTP_REPORT||'http.json';
if(!/^[a-zA-Z0-9_-]+\.json$/.test(reportName))throw Error('Unsafe report name');
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
const save=()=>fs.writeFileSync(path.join(root,'test-results',reportName),JSON.stringify(results,null,2));
for(const book of selectedBooks)for(const chapter of book.chapters){
  const row={chapterId:chapter.chapterId,url:chapter.audioUrl,checks:[]};
  results.push(row);save();
  for(const [name,method,range] of [['HEAD','HEAD',null],['start-range','GET','bytes=0-1023'],['middle-range','GET',`bytes=${Math.floor(chapter.bytes/2)}-${Math.floor(chapter.bytes/2)+1023}`],['full-hash','GET',null]]){
    const check={name,pass:false};row.checks.push(check);save();
    try{
    const {response,chain,attempts}=await probeRequest(chapter.audioUrl,method,range?{Range:range}:{});
    Object.assign(check,{status:response.status,chain,attempts});save();
    const headers=Object.fromEntries(['content-type','content-length','content-disposition','accept-ranges','content-range','access-control-allow-origin'].map(k=>[k,response.headers.get(k)]));
    const data=method==='HEAD'?null:Buffer.from(await response.arrayBuffer());
    Object.assign(check,{headers,bytes:data?.length||0});save();
    if(range){assert.equal(response.status,206);assert.equal(data.length,1024);assert.ok(headers['content-range']?.endsWith('/'+chapter.bytes));}
    else{assert.equal(response.status,200);if(method==='GET'){check.sha256=hash(data);assert.equal(check.sha256,chapter.sha256);assert.equal(data.length,chapter.bytes);}}
    check.pass=true;save();
    }catch(error){check.error={name:error.name,code:error.code||null};if(error.probeAttempts)check.attempts=error.probeAttempts;save();throw Error('Probe failed: '+chapter.chapterId+' '+name+'; sanitized status and transport evidence saved in '+reportName);}
  }
}
save();
console.log(JSON.stringify(results,null,2));
