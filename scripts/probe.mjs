import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,load,hash} from './catalog.mjs';
async function request(url,method,headers={}){
  const chain=[];
  for(let hop=0;hop<8;hop++){
    const response=await fetch(url,{method,headers,redirect:'manual',signal:AbortSignal.timeout(45000)});
    chain.push({origin:new URL(url).origin,status:response.status});
    if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.get('location');if(!location)throw Error('Missing redirect Location');
      const next=new URL(location,url);if(next.protocol!=='https:')throw Error('Unsafe redirect');
      await response.body?.cancel();url=next.href;continue;
    }
    return {response,chain};
  }
  throw Error('Redirect loop');
}
const results=[],allBooks=load('data/books.json').books;
const requested=new Set((process.env.BOOK_IDS||'').split(',').filter(Boolean));
for(const id of requested)if(!allBooks.some(b=>b.bookId===id))throw Error('Unknown probe book: '+id);
const selectedBooks=requested.size?allBooks.filter(b=>requested.has(b.bookId)):allBooks;
const reportName=process.env.HTTP_REPORT||'http.json';
if(!/^[a-zA-Z0-9_-]+\.json$/.test(reportName))throw Error('Unsafe report name');
for(const book of selectedBooks)for(const chapter of book.chapters){
  const row={chapterId:chapter.chapterId,url:chapter.audioUrl,checks:[]};
  for(const [name,method,range] of [['HEAD','HEAD',null],['start-range','GET','bytes=0-1023'],['middle-range','GET',`bytes=${Math.floor(chapter.bytes/2)}-${Math.floor(chapter.bytes/2)+1023}`],['full-hash','GET',null]]){
    const {response,chain}=await request(chapter.audioUrl,method,range?{Range:range}:{});
    const headers=Object.fromEntries(['content-type','content-length','content-disposition','accept-ranges','content-range','access-control-allow-origin'].map(k=>[k,response.headers.get(k)]));
    const data=method==='HEAD'?null:Buffer.from(await response.arrayBuffer());
    const check={name,status:response.status,chain,headers,bytes:data?.length||0};
    if(range){assert.equal(response.status,206);assert.equal(data.length,1024);assert.ok(headers['content-range']?.endsWith('/'+chapter.bytes));}
    else{assert.equal(response.status,200);if(method==='GET'){check.sha256=hash(data);assert.equal(check.sha256,chapter.sha256);assert.equal(data.length,chapter.bytes);}}
    check.pass=true;row.checks.push(check);
  }
  results.push(row);
}
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});fs.writeFileSync(path.join(root,'test-results',reportName),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
