import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAudioSession} from '../src/audio-session.js';
import {bindMediaSession} from '../src/media-session.js';

test('an explicit play request reaches native playback even when the session still reports interrupted',()=>{
 const session={state:'interrupted',type:'auto'},control=createAudioSession({audioSession:session});
 assert.equal(control.prepare(),false,'Automatic recovery must keep yielding');
 assert.equal(control.prepare({userInitiated:true}),true,'The browser must decide an explicit user request, rather than our code deadlocking it');
 assert.equal(session.type,'playback');
 assert.equal(control.interrupted(),true,'Do not fabricate a native state transition');
});

function mediaHarness(session){
 const audio=new EventTarget();Object.assign(audio,{currentTime:12,duration:120,playbackRate:1.5,paused:false});
 const hooks={play(){},pause(){},previous(){},next(){},seek(){},current:()=>({bookId:'book',chapterId:'chapter',bookTitle:'書名',chapterTitle:'章名'})};
 return {audio,controls:bindMediaSession(audio,hooks,{mediaSession:session})};
}
test('same-chapter playback restores metadata cleared by the platform',()=>{
 const original=globalThis.MediaMetadata;globalThis.MediaMetadata=class{constructor(data){Object.assign(this,data);}};
 try{const session={setActionHandler(){},setPositionState(){}},h=mediaHarness(session);h.controls.update();assert.equal(session.metadata.title,'章名');session.metadata=null;h.audio.dispatchEvent(new Event('playing'));assert.equal(session.metadata?.title,'章名');assert.equal(session.metadata?.artist,'書名');}
 finally{if(original===undefined)delete globalThis.MediaMetadata;else globalThis.MediaMetadata=original;}
});
test('unsupported metadata cannot prevent native playback state and position reporting',()=>{
 const original=globalThis.MediaMetadata;globalThis.MediaMetadata=class{constructor(data){Object.assign(this,data);}};
 try{let position;const session={setActionHandler(){},set metadata(value){throw Error('Metadata unavailable');},setPositionState(value){position=value;}},h=mediaHarness(session);h.controls.update();assert.equal(session.playbackState,'playing');assert.equal(position.position,12);}
 finally{if(original===undefined)delete globalThis.MediaMetadata;else globalThis.MediaMetadata=original;}
});
