export function createSleepTimer({pause,changed=()=>{},now=()=>Date.now()}){
 let deadline=null,chapter=false;
 const notify=()=>changed({deadline,chapter});
 function set(value){chapter=value==='chapter';deadline=!chapter&&Number(value)>0?now()+Number(value)*60000:null;notify();}
 function tick(){if(deadline!==null&&now()>=deadline){deadline=null;chapter=false;notify();pause();return true;}return false;}
 function chapterEnded(){if(!chapter)return false;chapter=false;deadline=null;notify();pause();return true;}
 return {set,tick,chapterEnded};
}
