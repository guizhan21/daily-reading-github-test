import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chapterProgress, continueIndex} from '../src/progress.js';
const book={chapters:[{chapterId:'a',durationSec:100},{chapterId:'b',durationSec:150}]};
test('unfinished chapter restores its exact position and speed',()=>assert.deepEqual(chapterProgress({positionSec:37.25,rate:1.5},100),{positionSec:37.25,rate:1.5,completed:false}));
test('finished and legacy near-end chapters replay from zero',()=>{for(const s of [{positionSec:100},{positionSec:99.5},{positionSec:50,completed:true}])assert.deepEqual(chapterProgress(s,100),{positionSec:0,rate:1,completed:true});});
test('invalid progress cannot seek outside audio or use invalid speed',()=>{for(const p of [-4,NaN,Infinity,'12'])assert.equal(chapterProgress({positionSec:p,rate:20},100).positionSec,0);assert.equal(chapterProgress({positionSec:200},100).completed,true);});
test('continue uses the active unfinished chapter and does not mix chapter positions',()=>{assert.equal(continueIndex(book,{activeChapter:'b',chapters:{a:{positionSec:12},b:{positionSec:25}}}),1);});
test('completed active chapter advances to first unfinished; completed book can replay',()=>{assert.equal(continueIndex(book,{activeChapter:'a',chapters:{a:{positionSec:100}}}),1);assert.equal(continueIndex(book,{chapters:{a:{completed:true},b:{completed:true}}}),0);});
