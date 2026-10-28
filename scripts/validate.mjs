import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root, load, validate, hash} from './catalog.mjs';
import {readStagedFile} from './git-staged.mjs';
import {validateProjection} from './dedup.mjs';
validate(load('data/books.json'), load('data/site.json'));
validateProjection(load('public/dedup/catalog.json'),load('data/books.json').books,load('data/dedup-baseline.json'));
const art=load('data/skin-art.json'),seenSkins=new Set();
for(const skin of art.skins){if(!['coast','forest','pixel'].includes(skin.id)||seenSkins.has(skin.id)||!/^skins\/(coast|forest|pixel)-[0-9a-f]{8}\.png$/.test(skin.reference))throw Error('Invalid approved skin asset');seenSkins.add(skin.id);const b=fs.readFileSync(path.join(root,'public',skin.reference));if(hash(b)!==skin.sha256||b.length!==skin.bytes||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Changed approved Image asset');}
if(seenSkins.size!==3)throw Error('All three approved skins required');
for (const book of load('data/books.json').books) {
  if (!fs.existsSync(path.join(root, 'public', book.cover))) {
    if (!load('data/site.json').coverRecoveryPending) throw Error('Missing cover');
    console.log('PENDING: existing cover recovery; site must not be marked PASS.');
  }
  for (const chapter of book.chapters) {
    const buffer = fs.readFileSync(path.join(root, 'public', chapter.markdown));
    if (hash(buffer) !== chapter.textSha256) throw Error('Markdown differs from original');
  }
}
let files;
try { files = execFileSync('git', ['ls-files', '-z'], {cwd:root, encoding:'utf8'}).split('\0').filter(Boolean); }
catch { throw Error('Run validation inside the isolated Git repository'); }
const working=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const forbidden = /(^|\/)(\.env[^/]*|storage|backups?|\.vercel|node_modules|incoming|\.tmp|\.cache|\.tools|test-results|\.publish-jobs|\.jobs|cookies?[^/]*|credentials?[^/]*)(\/|$)|\.(m4a|aac|mp3|mp4|wav|db|sqlite[^.]*|zip|pem|key)$/i;
const secret = /(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|vercel_blob_rw_[A-Za-z0-9_]+|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
const privatePath=/[A-Za-z]:[\\/](?:Users|Downloads|每日讀書)[\\/]/;
for(const file of working){if(forbidden.test(file))throw Error('Forbidden public working file: '+file);if(fs.lstatSync(path.join(root,file)).isSymbolicLink())throw Error('Linked public file');if(!/\.(png|jpe?g|webp)$/i.test(file)){const text=fs.readFileSync(path.join(root,file),'utf8');if(secret.test(text)||privatePath.test(text))throw Error('Private bytes in public working file: '+file);}}
for (const file of files) {
  if (forbidden.test(file)) throw Error(`Forbidden tracked path: ${file}`);
  // Inspect the staged bytes, including partial staging, before they can be committed.
  const buffer = readStagedFile(root,file);
  if (secret.test(buffer.toString('utf8'))||privatePath.test(buffer.toString('utf8'))) throw Error(`Private bytes in staged file: ${file}`);
}
const historical=execFileSync('git',['rev-list','--objects','--all'],{cwd:root,encoding:'utf8'});
for(const line of historical.split('\n')){const space=line.indexOf(' ');if(space>0&&forbidden.test(line.slice(space+1)))throw Error('Forbidden file in Git history');}
console.log(`Validated catalog, unchanged Markdown and ${files.length} tracked files; no audio, SQL, backups or secrets.`);
