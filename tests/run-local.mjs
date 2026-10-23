import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';import {root,load} from '../scripts/catalog.mjs';
const port=process.env.PORT||'4173',url='http://127.0.0.1:'+port+load('data/site.json').basePath;
const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe'],windowsHide:true});
async function test(file,headed=false){
 const xvfb=headed&&process.platform==='linux'&&!process.env.DISPLAY;
 const command=xvfb?'xvfb-run':process.execPath,args=xvfb?['-a',process.execPath,file]:[file];
 const child=spawn(command,args,{cwd:root,env:{...process.env,SITE_URL:url},stdio:'inherit',windowsHide:true});
 return await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>resolve(code??1));});
}
try{
 let ready=false;for(let n=0;n<50;n++){try{const r=await fetch(url);if(r.ok){ready=true;break;}}catch{}await delay(100);}if(!ready)throw Error('Static server did not start');
 process.exitCode=await test('tests/browser.mjs');if(process.exitCode===0&&(process.env.BROWSER||'chrome')==='chrome')process.exitCode=await test('tests/background.mjs',true);
}finally{server.kill();}
