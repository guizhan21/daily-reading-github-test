import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chapterProgress, continueIndex, bookStatus, chapterWasFinished, allChaptersFinished, updateChapterProgress, reconcileBookProgress, setBookShelf} from '../src/progress.js';
const book={chapters:[{chapterId:'a',durationSec:100},{chapterId:'b',durationSec:150}]};
test('unfinished chapter restores its exact position and speed',()=>assert.deepEqual(chapterProgress({positionSec:37.25,rate:1.5},100),{positionSec:37.25,rate:1.5,completed:false}));
test('finished and legacy near-end chapters replay from zero',()=>{for(const s of [{positionSec:100},{positionSec:99.5},{positionSec:50,completed:true}])assert.deepEqual(chapterProgress(s,100),{positionSec:0,rate:1,completed:true});});
test('invalid progress cannot seek outside audio or use invalid speed',()=>{for(const p of [-4,NaN,Infinity,'12'])assert.equal(chapterProgress({positionSec:p,rate:20},100).positionSec,0);assert.equal(chapterProgress({positionSec:200},100).completed,true);});
test('continue uses the active unfinished chapter and does not mix chapter positions',()=>{assert.equal(continueIndex(book,{activeChapter:'b',chapters:{a:{positionSec:12},b:{positionSec:25}}}),1);});
test('completed active chapter advances to first unfinished; completed book can replay',()=>{assert.equal(continueIndex(book,{activeChapter:'a',chapters:{a:{positionSec:100}}}),1);assert.equal(continueIndex(book,{chapters:{a:{completed:true},b:{completed:true}}}),0);});
test('new books and metadata-only saved state remain unread',()=>{for(const s of [undefined,{}, {activeChapter:'a',chapters:{a:{positionSec:0,rate:1.5}}}])assert.equal(bookStatus(book,s),'unread');});
test('legacy audio, reading and completion records are classified without migration',()=>{for(const s of [{chapters:{a:{positionSec:37}}},{readChapter:'b'},{chapters:{a:{readingY:500}}},{chapters:{b:{completed:true}}},{started:true}])assert.equal(bookStatus(book,s),'reading');});
test('only completion of every known chapter finishes the whole book',()=>{assert.equal(bookStatus(book,{chapters:{a:{completed:true},b:{positionSec:149.5}}}),'completed');assert.equal(bookStatus(book,{chapters:{a:{completed:true},missing:{completed:true}}}),'reading');assert.equal(bookStatus({chapters:[]},{}),'unread');});
test('manual text-reading completion or shelf reset preserves chapter progress',()=>{const chapters={a:{positionSec:37,rate:1.5},b:{readingY:500}};for(const status of ['unread','reading','completed']){const saved={shelfOverride:status,chapters};assert.equal(bookStatus(book,saved),status);assert.equal(saved.chapters.a.positionSec,37);assert.equal(saved.chapters.a.rate,1.5);}assert.equal(bookStatus(book,{shelfOverride:'invalid'}),'unread');});
test('stale Reading cannot mask every finished audio chapter',()=>{
 const saved={shelfOverride:'reading',chapters:{a:{completed:true},b:{completed:true}}};
 assert.equal(bookStatus(book,saved),'completed');
});
test('replaying and seeking a finished chapter preserves history and exact new position',()=>{
 const original={positionSec:100,completed:true,rate:1.5,readingY:450};
 const p=updateChapterProgress(original,100,{positionSec:32,completed:false,rate:1.25});
 assert.equal(p.completedOnce,true);assert.equal(p.readingY,450);
 assert.deepEqual(chapterProgress(p,100),{positionSec:32,completed:false,rate:1.25});
 assert.equal(bookStatus(book,{chapters:{a:p,b:{completed:true}}}),'completed');
 assert.equal(original.positionSec,100);
});
test('legacy completion reconciliation preserves all offsets and removes only stale Reading',()=>{
 const saved={shelfOverride:'reading',favorite:true,activeChapter:'b',chapters:{a:{positionSec:100,rate:1.5,readingY:555},b:{positionSec:149.5}}};
 const result=reconcileBookProgress(book,saved);
 assert.equal(result.shelfOverride,undefined);assert.equal(result.favorite,true);assert.equal(result.activeChapter,'b');
 assert.equal(result.chapters.a.completedOnce,true);assert.equal(result.chapters.b.completedOnce,true);
 assert.equal(result.chapters.a.positionSec,100);assert.equal(result.chapters.a.rate,1.5);assert.equal(result.chapters.a.readingY,555);
 assert.equal(saved.shelfOverride,'reading');assert.equal(saved.chapters.a.completedOnce,undefined);
});
test('completion history still requires every known chapter including catalog additions',()=>{
 const saved={chapters:{a:{completedOnce:true,positionSec:0,completed:false},b:{completedOnce:true}}};
 assert.equal(allChaptersFinished(book,saved),true);
 assert.equal(bookStatus({...book,chapters:[...book.chapters,{chapterId:'c',durationSec:50}]},saved),'reading');
 assert.equal(allChaptersFinished({chapters:[]},saved),false);
 assert.equal(bookStatus(book,{chapters:{a:saved.chapters.a}}),'reading');
});
test('explicit reclassification of a finished book starts a fresh cycle without wiping positions',()=>{
 const saved={chapters:{a:{positionSec:37,completedOnce:true,rate:1.5,readingY:500},b:{positionSec:150,completed:true}}};
 for(const shelf of ['unread','reading']){
  const next=setBookShelf(book,saved,shelf);assert.equal(bookStatus(book,next),shelf);
  assert.equal(next.chapters.a.positionSec,37);assert.equal(next.chapters.a.rate,1.5);assert.equal(next.chapters.a.readingY,500);
  assert.equal(next.chapters.b.completed,true);assert.equal(next.chapters.b.completedOnce,false);
  const preloaded=updateChapterProgress(next.chapters.b,150,{positionSec:0,completed:true});
  assert.equal(chapterWasFinished(preloaded,150),false);
 }
 assert.equal(saved.chapters.a.completedOnce,true);
});
test('a fresh cycle only completes after new native ends for every chapter',()=>{
 let saved=setBookShelf(book,{chapters:{a:{completed:true},b:{completed:true}}},'reading');
 saved.chapters.a=updateChapterProgress(saved.chapters.a,100,{positionSec:100,completed:true},true);
 assert.equal(bookStatus(book,saved),'reading');
 saved.chapters.b=updateChapterProgress(saved.chapters.b,150,{positionSec:150,completed:true},true);
 assert.equal(bookStatus(book,saved),'completed');
});
test('marking a partially finished book Unread retains its finished chapters for later completion',()=>{
 const saved=setBookShelf(book,{chapters:{a:{completed:true},b:{positionSec:30,rate:1.5}}},'unread');
 assert.equal(chapterWasFinished(saved.chapters.a,100),true);assert.equal(saved.chapters.b.positionSec,30);
 saved.shelfOverride='reading';saved.chapters.b=updateChapterProgress(saved.chapters.b,150,{positionSec:150,completed:true},true);
 assert.equal(bookStatus(book,saved),'completed');
});
test('manual text completion remains available without inventing audio completion history',()=>{
 const saved=setBookShelf(book,{chapters:{a:{positionSec:32}}},'completed');
 assert.equal(bookStatus(book,saved),'completed');assert.equal(allChaptersFinished(book,saved),false);assert.equal(saved.chapters.a.positionSec,32);
});
test('legacy explicitly Unread finished book retains its deliberate new-cycle choice',()=>{
 const saved={shelfOverride:'unread',chapters:{a:{positionSec:100,completed:true},b:{positionSec:150,completed:true,rate:1.5}}};
 const repaired=reconcileBookProgress(book,saved);assert.equal(bookStatus(book,repaired),'unread');
 assert.equal(repaired.chapters.b.positionSec,150);assert.equal(repaired.chapters.b.rate,1.5);
 repaired.shelfOverride='reading';assert.equal(bookStatus(book,repaired),'reading');assert.equal(allChaptersFinished(book,repaired),false);
});
