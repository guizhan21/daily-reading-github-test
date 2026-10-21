import fs from 'node:fs';
import path from 'node:path';
import {renderMarkdown} from './render.mjs';
import {root, load, validate, safeRelative} from './catalog.mjs';
const config = load('data/site.json'), catalog = load('data/books.json');
validate(catalog, config);
const dist = path.join(root, 'dist');
// Only this computed, fixed child directory is ever removed.
if (path.dirname(dist) !== root || fs.existsSync(dist) && fs.lstatSync(dist).isSymbolicLink()) throw Error('Unsafe output');
fs.rmSync(dist, {recursive:true, force:true}); fs.mkdirSync(dist);
fs.cpSync(path.join(root, 'public'), dist, {recursive:true, dereference:false, filter:source => {
  if (fs.lstatSync(source).isSymbolicLink()) throw Error('Links prohibited');
  if (/\.(m4a|aac|mp3|mp4|wav|zip|db|sqlite)$/i.test(source)) throw Error('No media audio/data in Pages');
  return true;
}});
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let body = '';
for (const book of catalog.books) for (const ch of book.chapters) {
  const source = fs.readFileSync(path.join(root, 'public', safeRelative(ch.markdown)), 'utf8');
  body += `<article class="prose" id="text-${escape(ch.chapterId)}" hidden>${renderMarkdown(source)}</article>`;
}
let html = fs.readFileSync(path.join(root,'src/index.html'),'utf8');
html = html.replaceAll('{{BASE}}', escape(config.basePath)).replace('{{TITLE}}', escape(config.title)).replace('{{CHAPTERS}}', body);
fs.writeFileSync(path.join(dist,'index.html'), html);
for (const file of ['app.js','style.css']) fs.copyFileSync(path.join(root,'src',file), path.join(dist,file));
fs.mkdirSync(path.join(dist,'data'),{recursive:true});
fs.copyFileSync(path.join(root,'data/books.json'),path.join(dist,'data/books.json'));
fs.writeFileSync(path.join(dist,'.nojekyll'),'');
let bytes=0;function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else bytes+=fs.statSync(p).size;}}walk(dist);
console.log(JSON.stringify({books:catalog.books.length,chapters:catalog.books.flatMap(b=>b.chapters).length,pagesBytes:bytes,audioBytesInPages:0,basePath:config.basePath}));
