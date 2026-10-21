import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,load,hash} from './catalog.mjs';
const catalog=load('data/books.json');
const paths=[...new Set(catalog.books.flatMap(b=>[b.cover,...(b.references?[b.references]:[]),...b.chapters.map(c=>c.markdown)]))];
const result={schemaVersion:1,exportedAt:new Date().toISOString(),repository:load('data/site.json').repository,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),catalogSha256:hash(Buffer.from(JSON.stringify(catalog))),books:catalog.books,staticFiles:paths.map(file=>{const data=fs.readFileSync(path.join(root,'public',file));return {path:'public/'+file,sha256:hash(data),bytes:data.length};})};
const output=path.join(root,'.tmp/library-export.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(output);
