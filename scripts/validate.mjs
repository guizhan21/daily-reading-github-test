import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root, load, validate, hash} from './catalog.mjs';
validate(load('data/books.json'), load('data/site.json'));
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
const forbidden = /(^|\/)(\.env[^/]*|storage|backups?|\.vercel|node_modules|incoming)(\/|$)|\.(m4a|aac|mp3|mp4|wav|db|sqlite[^.]*|zip|pem|key)$/i;
const secret = /(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|vercel_blob_rw_[A-Za-z0-9_]+|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
for (const file of files) {
  if (forbidden.test(file)) throw Error(`Forbidden tracked path: ${file}`);
  const buffer = fs.readFileSync(path.join(root, file));
  if (buffer.length > 2_000_000) throw Error(`Unexpected large Git file: ${file}`);
  if (!/\.(png|jpe?g|webp)$/i.test(file) && secret.test(buffer.toString('utf8'))) throw Error(`Credential pattern: ${file}`);
}
const historical=execFileSync('git',['rev-list','--objects','--all'],{cwd:root,encoding:'utf8'});
for(const line of historical.split('\n')){const space=line.indexOf(' ');if(space>0&&forbidden.test(line.slice(space+1)))throw Error('Forbidden file in Git history');}
console.log(`Validated catalog, unchanged Markdown and ${files.length} tracked files; no audio, SQL, backups or secrets.`);
