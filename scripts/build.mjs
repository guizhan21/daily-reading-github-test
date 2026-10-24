import fs from 'node:fs';
import {icon} from '../src/icons.js';
import path from 'node:path';
import crypto from 'node:crypto';
import {renderMarkdown} from './render.mjs';
import {root, load, validate, safeRelative, buildTarget} from './catalog.mjs';
const config = load('data/site.json'), catalog = load('data/books.json');
const assets=['app.js','progress.js','preferences.js','ambience.js','media-session.js','audio-session.js','media-source.js','playback-health.js','player-view.js','sleep-timer.js','navigation-gesture.js','icons.js','controls.css','style.css','storybook.css','listening-room.css','reference-layout.css'];
const assetVersion=crypto.createHash('sha256').update(assets.map(file=>fs.readFileSync(path.join(root,'src',file),'utf8').replaceAll('\r\n','\n')).join('\n')).digest('hex').slice(0,16);
validate(catalog, config);
const args=process.argv.slice(2);if(args.length>1||args.some(a=>a!=='--root'))throw Error('Unsupported build argument');
const target=buildTarget(config,args.includes('--root')?'root':'project'),dist = path.join(root,target.directory);
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
for (const book of catalog.books) if(book.references){
 const source=fs.readFileSync(path.join(root,'public',safeRelative(book.references)),'utf8');
 body+=`<article class="prose" id="text-references-${escape(book.bookId)}" hidden>${renderMarkdown(source)}</article>`;
}
let html = fs.readFileSync(path.join(root,'src/index.html'),'utf8');
html=html.replace(/\{\{ICON:([a-z]+)\}\}/g,(_,name)=>icon(name));
html = html.replaceAll('{{BASE}}', escape(target.basePath)).replaceAll('{{ASSET_VERSION}}',assetVersion).replace('{{TITLE}}', escape(config.title)).replace('{{CHAPTERS}}', body);
fs.writeFileSync(path.join(dist,'index.html'), html);
for (const file of assets) {
 const source=fs.readFileSync(path.join(root,'src',file),'utf8');
 fs.writeFileSync(path.join(dist,file),file.endsWith('.js')?source.replace(/from '(\.\/[^'?]+\.js)'/g,(_,module)=>"from '"+module+'?v='+assetVersion+"'"):source);
}
fs.mkdirSync(path.join(dist,'data'),{recursive:true});
fs.copyFileSync(path.join(root,'data/books.json'),path.join(dist,'data/books.json'));
fs.writeFileSync(path.join(dist,'.nojekyll'),'');
let bytes=0;function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else bytes+=fs.statSync(p).size;}}walk(dist);
console.log(JSON.stringify({books:catalog.books.length,chapters:catalog.books.flatMap(b=>b.chapters).length,pagesBytes:bytes,audioBytesInPages:0,basePath:target.basePath,assetVersion}));
