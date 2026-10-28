import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
import {cardCoverPath} from '../src/cover-assets.js';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export async function buildCardCovers(books,publicRoot,outputRoot){
 const entries=[];
 for(const book of books){
  if(book.coverKind==='original-template')continue;
  const source=path.resolve(publicRoot,book.cover),destination=path.resolve(outputRoot,cardCoverPath(book));
  if(!source.startsWith(path.resolve(publicRoot)+path.sep)||!destination.startsWith(path.resolve(outputRoot)+path.sep))throw Error('Unsafe cover path');
  const original=fs.readFileSync(source),originalSha256=hash(original);
  const {data,info}=await sharp(original,{failOn:'warning'}).rotate().resize({width:480,height:720,fit:'inside',withoutEnlargement:true}).webp({quality:90,effort:6}).toBuffer({resolveWithObject:true});
  if(hash(fs.readFileSync(source))!==originalSha256)throw Error('Original cover changed during build');
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,data);
  entries.push({bookId:book.bookId,version:book.version,source:book.cover,sourceSha256:originalSha256,sourceBytes:original.length,path:cardCoverPath(book),sha256:hash(data),bytes:data.length,width:info.width,height:info.height,format:info.format});
 }
 const manifest={schema:1,purpose:'Display derivatives only; original covers preserved',entries};
 fs.writeFileSync(path.join(outputRoot,'cover-thumbnails.json'),JSON.stringify(manifest,null,2));return manifest;
}
