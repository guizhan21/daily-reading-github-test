import fs from 'node:fs';
import path from 'node:path';
import {root,load,hash} from './catalog.mjs';
const catalog=load('data/books.json');
const result={schemaVersion:1,exportedAt:new Date().toISOString(),repository:load('data/site.json').repository,catalogSha256:hash(Buffer.from(JSON.stringify(catalog))),books:catalog.books};
const output=path.join(root,'.tmp/library-export.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(output);
