import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';import {root,load,buildTarget} from '../scripts/catalog.mjs';
import fs from 'node:fs';import path from 'node:path';import {stopOwnedTestServer} from './owned-server-cleanup.mjs';
const port=process.env.PORT||'4173',target=buildTarget(load('data/site.json'),process.env.ROOT_SITE==='1'?'root':'project'),url='http://127.0.0.1:'+port+target.basePath;
const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe'],windowsHide:true});
async function test(file,headed=false){
 const xvfb=headed&&process.platform==='linux'&&!process.env.DISPLAY;
 const command=xvfb?'xvfb-run':process.execPath,args=xvfb?['-a',process.execPath,file]:[file];
 const child=spawn(command,args,{cwd:root,env:{...process.env,SITE_URL:url},stdio:'inherit',windowsHide:true});
 return await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>resolve(code??1));});
}
try{
 let ready=false;for(let n=0;n<50;n++){if(server.exitCode!==null)throw Error('Owned static server exited before readiness');try{const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(3000)});if(r.ok){ready=true;break;}}catch{}await delay(100);}if(!ready)throw Error('Static server did not start');
 process.exitCode=await test('tests/browser.mjs');if(process.exitCode===0&&(process.env.BROWSER||'chrome')==='chrome')process.exitCode=await test('tests/background.mjs',true);
}finally{const shutdown=await stopOwnedTestServer(server);fs.mkdirSync(path.join(root,'test-results'),{recursive:true});fs.writeFileSync(path.join(root,'test-results/local-server-shutdown.json'),JSON.stringify(shutdown,null,2));if(shutdown.forced){console.error('Test server needed forced termination; preserve its functional reports and investigate cleanup');process.exitCode=1;}else console.log('Owned test server shutdown confirmed');}
