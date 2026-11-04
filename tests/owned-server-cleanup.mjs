// The exact ChildProcess returned by our test-server spawn, never a discovered PID.
import {ChildProcess} from 'node:child_process';
async function deadline(promise,ms){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Owned test server did not exit')),ms);})]);}finally{clearTimeout(timer);}}
export async function stopOwnedTestServer(child,{graceMs=5000,requestClose=c=>c.kill('SIGTERM')}={}){
 if(!(child instanceof ChildProcess)||!Number.isSafeInteger(child.pid)||child.pid<=0)throw Error('Owned spawned test server required');
 if(child.exitCode!==null||child.signalCode!==null)return {pid:child.pid,alreadyExited:true,forced:false,code:child.exitCode,signal:child.signalCode};
 const exited=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
 requestClose(child);let forced=false,result;
 try{result=await deadline(exited,graceMs);}catch{forced=true;child.kill('SIGKILL');result=await deadline(exited,graceMs);}
 return {pid:child.pid,forced,...result};
}
