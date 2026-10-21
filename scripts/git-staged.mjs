import {execFileSync} from 'node:child_process';

// Inspect size before loading bytes so a rejected file never appears in an
// ENOBUFS error dump. Image covers have a separate bounded allowance.
export function readStagedFile(root,file){
 const limit=/\.(png|jpe?g|webp)$/i.test(file)?8*1024*1024:2_000_000;
 const size=Number(execFileSync('git',['cat-file','-s',`:${file}`],{cwd:root,encoding:'utf8',windowsHide:true}));
 if(!Number.isSafeInteger(size)||size<0||size>limit)throw Error(`Unexpected large Git file: ${file} (${size} bytes; limit ${limit})`);
 return execFileSync('git',['show',`:${file}`],{cwd:root,maxBuffer:limit+65536,windowsHide:true});
}
