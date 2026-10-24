import {test} from 'node:test';import assert from 'node:assert/strict';
import {createAudioSession} from '../src/audio-session.js';
test('absent or unavailable Audio Session API never prevents native audio',()=>{
 for(const platform of [undefined,{},Object.defineProperty({},'audioSession',{get(){throw Error('Unavailable');}})]){const s=createAudioSession(platform);assert.equal(s.interrupted(),false);assert.equal(s.prepare(),true);s.subscribe(()=>{})();}
});
test('playback requests select the native playback category without replacing audio',()=>{
 const session={state:'inactive',type:'auto'},s=createAudioSession({audioSession:session});assert.equal(s.prepare(),true);assert.equal(session.type,'playback');session.state='active';assert.equal(s.prepare(),true);
});
test('an OS interruption refuses to reclaim audio focus or change category',()=>{
 let writes=0;const session={state:'interrupted',set type(v){writes++;}},s=createAudioSession({audioSession:session});assert.equal(s.interrupted(),true);assert.equal(s.prepare(),false);assert.equal(writes,0);session.state='active';assert.equal(s.prepare(),true);assert.equal(writes,1);
});
test('unsupported category setters are optional; state events are detachable',()=>{
 const session=new EventTarget();Object.defineProperty(session,'type',{set(){throw Error('Unsupported');}});const s=createAudioSession({audioSession:session});assert.equal(s.prepare(),true);let calls=0;const unsubscribe=s.subscribe(()=>calls++);session.dispatchEvent(new Event('statechange'));assert.equal(calls,1);unsubscribe();session.dispatchEvent(new Event('statechange'));assert.equal(calls,1);
});
