import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { chapterProgress, updateChapterProgress, validRate } from '../src/progress.js';

const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const selectionCode=app.slice(app.indexOf('function selectChapter('),app.indexOf('\nfunction selectForUser('));
const recoveryCode=app.slice(app.indexOf('function resumePosition('),app.indexOf('\nconst health='));

function earlyConnectionFailure(savedPosition,completed){
 const first={chapterId:'one',audioUrl:'https://example.com/one.m4a',durationSec:318};
 const second={chapterId:'two',audioUrl:'https://example.com/two.m4a',durationSec:120};
 const book={bookId:'book',chapters:[first,second]};
 const saved={chapters:{one:{positionSec:savedPosition,completed,completedOnce:completed,rate:1.5}}};
 const audio={src:second.audioUrl,currentTime:0,readyState:0,seeking:false,duration:NaN,paused:true,error:null,
  pause(){this.paused=true;},removeAttribute(){this.src='';},load(){this.currentTime=0;this.readyState=0;this.error=null;}};
 const recoveries=[];
 const c={audio,book,index:1,selection:0,loading:false,pendingRestore:null,pendingUserSeek:null,requestedSeek:null,
  previewSeek:null,wantsPlayback:false,endedRecorded:false,clockJumpPending:null,playbackSelection:0,recoveryCount:0,
  chapterProgress,updateChapterProgress,validRate,playbackClock:{reset(){}},localBook:()=>saved,state:{},
  currentSource:()=>audio.src.split('?')[0],store(){},persist(){},display(){},markActive(){},playerView:{update(){}},
  $:()=>({}),performance:{now:()=>1},play(){audio.paused=false;},retryAudioURL:(url,count)=>count?url+'?retry='+count:url,
  retryableMediaError:()=>true,navigator:{onLine:true},audioSession:{interrupted:()=>false},queueMicrotask:fn=>fn(),
  console:{info:line=>recoveries.push(JSON.parse(line.slice('audio-recovery '.length)))}};
 vm.createContext(c);
 vm.runInContext(selectionCode+'\n'+recoveryCode,c);
 c.selectChapter(0,true,book,false,false,true);
 assert.equal(audio.readyState,0);
 audio.error={code:4,message:'Failed to open media'};
 c.mediaError();
 return {recoveries,saved,c};
}

test('a finished chapter reconnects at zero if Firefox cannot open the replay before metadata',()=>{
 const {recoveries,saved,c}=earlyConnectionFailure(318,true);
 assert.deepEqual(recoveries.map(r=>[r.chapterId,r.positionSec,r.attempt]),[['one',0,1]]);
 assert.equal(c.index,0);
 assert.equal(saved.chapters.one.completedOnce,true);
});

test('a reconnect before metadata still preserves an unfinished chapter’s saved position',()=>{
 const {recoveries}=earlyConnectionFailure(37,false);
 assert.deepEqual(recoveries.map(r=>[r.chapterId,r.positionSec,r.attempt]),[['one',37,1]]);
});
