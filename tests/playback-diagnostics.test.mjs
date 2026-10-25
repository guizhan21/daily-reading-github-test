import {test} from 'node:test';import assert from 'node:assert/strict';
import {safePlaybackEvent,createPlaybackDiagnostics} from '../src/playback-diagnostics.js';
test('playback traces strip URL queries, credentials, titles and unknown fields',()=>{
 const event=safePlaybackEvent('playing',{currentSrc:'https://name:secret@example.com/audio?token=secret',currentTime:37.1234,duration:100,playbackRate:1.5},{bookId:'book',chapterId:'chapter',token:'secret',title:'private'},{pageOrigin:'https://example.com/path?token=secret',referrer:'https://other.example/path?token=secret',sessionState:'interrupted'});
 assert.equal(event.sourceOrigin,'https://example.com');assert.equal(event.referrerOrigin,'https://other.example');assert.equal(event.positionSec,37.123);assert.ok(!JSON.stringify(event).includes('secret'));assert.ok(!JSON.stringify(event).includes('private'));assert.equal(safePlaybackEvent('invalid?secret',{},{}).kind,'unknown');
});
test('diagnostics are bounded and storage denial cannot break playback',()=>{
 const audio=new EventTarget(),platform=new EventTarget();Object.assign(audio,{currentTime:1,paused:false});Object.assign(platform,{navigator:{},document:new EventTarget()});Object.defineProperty(platform,'localStorage',{get(){throw Error('Denied');}});
 const log=createPlaybackDiagnostics(audio,{platform,read:()=>({bookId:'book'})});for(let n=0;n<150;n++)audio.dispatchEvent(new Event('playing'));assert.equal(log.export().events.length,100);assert.equal(log.export().events.at(-1).kind,'playing');
});
