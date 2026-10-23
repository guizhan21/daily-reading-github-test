import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {root,load,buildTarget} from './catalog.mjs';
const catalog=load('data/books.json'),rights=load('data/publication-rights.json').books.filter(b=>b.decision==='approved');
assert.equal(catalog.books.length,rights.length,'Incomplete migration: reviewed books still await recovery');
for(const review of rights){const b=catalog.books.find(b=>b.bookId===review.bookId&&b.version===review.version);assert.ok(b,'Missing reviewed book '+review.bookId);assert.equal(b.chapters.length,review.chapters.length);for(const c of review.chapters){const ch=b.chapters.find(ch=>ch.chapterId===c.chapterId);assert.ok(ch&&ch.sha256===c.audioSha256&&ch.textSha256===c.textSha256);}}
const target=buildTarget(load('data/site.json'),process.argv.includes('--root')?'root':'project');
let bytes=0,files=0;function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);assert.ok(!e.isSymbolicLink());if(e.isDirectory())walk(p);else{assert.ok(!/\.(m4a|aac|mp3|mp4|wav|db|sqlite\w*|zip)$/i.test(e.name));bytes+=fs.statSync(p).size;files++;}}}walk(path.join(root,target.directory));
assert.ok(fs.readFileSync(path.join(root,target.directory,'index.html'),'utf8').includes('<base href="'+target.basePath+'">'));
const pkg=load('package.json');for(const name of Object.keys({...pkg.dependencies,...pkg.devDependencies}))assert.ok(!/vercel|sqlite|postgres|firebase|cloudflare|supabase/i.test(name));
console.log(JSON.stringify({books:catalog.books.length,chapters:catalog.books.flatMap(b=>b.chapters).length,allReviewedVersionsPresent:true,pagesBytes:bytes,pagesFiles:files,audioBytesInPages:0,runtime:'static browser only'}));
