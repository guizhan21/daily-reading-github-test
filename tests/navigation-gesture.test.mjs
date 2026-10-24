import assert from 'node:assert/strict';import test from 'node:test';
import {isBackSwipe} from '../src/navigation-gesture.js';
const start={x:300,y:300,time:100};
test('deliberate left swipe returns one level',()=>assert.equal(isBackSwipe(start,{x:100,y:315,time:350}),true));
test('right swipe remains native',()=>assert.equal(isBackSwipe(start,{x:400,y:305,time:350}),false));
test('vertical reading and diagonal scrolling do not navigate',()=>{for(const end of [{x:280,y:100,time:350},{x:100,y:180,time:350}])assert.equal(isBackSwipe(start,end),false);});
test('taps, jitter and slow drags do not navigate',()=>{for(const end of [{x:290,y:300,time:300},{x:100,y:300,time:101},{x:100,y:300,time:1200}])assert.equal(isBackSwipe(start,end),false);});
