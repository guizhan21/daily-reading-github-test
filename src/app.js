const $ = id => document.getElementById(id);
const audio = $('audio'), storageKey = 'daily-reading-github:v1';
let state = {schema:1, books:{}}, catalog, book, index=0, loading=false, lastSave=0;
try { const saved=JSON.parse(localStorage.getItem(storageKey)); if(saved?.schema===1 && saved.books && typeof saved.books==='object') state=saved; } catch { /* Storage may be unavailable; playback still works. */ }
const finite = (n, fallback=0) => Number.isFinite(n) && n>=0 ? n : fallback;
const time = n => `${Math.floor(finite(n)/60)}:${String(Math.floor(finite(n)%60)).padStart(2,'0')}`;
function currentState(){return state.books[book.bookId] ||= {chapters:{}};}
function persist(){
  if(!book || loading || !audio.readyState) return;
  const saved=currentState();saved.activeChapter=book.chapters[index].chapterId;
  saved.chapters[book.chapters[index].chapterId]={positionSec:finite(audio.currentTime),rate:audio.playbackRate,readingY:window.scrollY};
  try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{$('status').textContent='瀏覽器無法保存進度；仍可播放';}
  lastSave=Date.now();
}
function display(){
  $('current').textContent=time(audio.currentTime);$('duration').textContent=time(audio.duration);
  $('seek').max=String(finite(audio.duration));$('seek').value=String(finite(audio.currentTime));
  $('play').textContent=audio.paused?'播放':'暫停';$('play').setAttribute('aria-label',audio.paused?'播放':'暫停');
}
async function play(){try{await audio.play();$('status').textContent='播放中 · 進度儲存在本機';}catch(e){$('status').textContent=`無法播放：${e.message}`;}}
function selectChapter(next, autoplay=false){
  persist();audio.pause();loading=true;index=next;
  const ch=book.chapters[index], saved=currentState().chapters?.[ch.chapterId];
  currentState().activeChapter=ch.chapterId;
  $('now-title').textContent=ch.title;$('status').textContent='載入原始音訊…';
  for(const item of document.querySelectorAll('article.prose'))item.hidden=item.id!==`text-${ch.chapterId}`;
  for(const [i,button] of [...$('chapters').children].entries())button.setAttribute('aria-current',String(i===index));
  $('previous').disabled=index===0;$('next').disabled=index===book.chapters.length-1;
  audio.onloadedmetadata=()=>{
    const max=finite(audio.duration);audio.currentTime=Math.min(finite(saved?.positionSec),Math.max(0,max-.1));
    const rate=[.75,1,1.25,1.5,2].includes(saved?.rate)?saved.rate:1;audio.playbackRate=rate;$('rate').value=String(rate);
    loading=false;display();$('status').textContent='已就緒 · 進度儲存在本機';persist();
    if(autoplay)void play();
  };
  audio.src=ch.audioUrl;audio.load();display();
  window.scrollTo(0,finite(saved?.readingY));
}
function selectBook(id){
  persist();loading=true;book=catalog.books.find(b=>b.bookId===id)||catalog.books[0];
  $('book-title').textContent=book.title;$('cover').src=book.cover;$('book-select').value=book.bookId;
  $('chapters').replaceChildren(...book.chapters.map((ch,i)=>{const button=document.createElement('button');button.textContent=`${i+1}. ${ch.title}`;button.addEventListener('click',()=>selectChapter(i,false));return button;}));
  const active=state.books[book.bookId]?.activeChapter;
  selectChapter(Math.max(0,book.chapters.findIndex(ch=>ch.chapterId===active)));
}
$('play').addEventListener('click',()=>{if(audio.paused)void play();else audio.pause();});
$('previous').addEventListener('click',()=>{if(index>0)selectChapter(index-1,true);});
$('next').addEventListener('click',()=>{if(index<book.chapters.length-1)selectChapter(index+1,true);});
$('seek').addEventListener('input',()=>{if(!loading&&audio.readyState){audio.currentTime=Number($('seek').value);display();}});
$('seek').addEventListener('change',persist);
$('rate').addEventListener('change',()=>{audio.playbackRate=Number($('rate').value);persist();});
$('book-select').addEventListener('change',()=>selectBook($('book-select').value));
audio.addEventListener('timeupdate',()=>{display();if(Date.now()-lastSave>5000)persist();});
audio.addEventListener('pause',()=>{display();persist();if(!loading)$('status').textContent='已暫停 · 本機進度已保存';});
audio.addEventListener('play',display);audio.addEventListener('seeked',persist);
audio.addEventListener('error',()=>{$('status').textContent=`音訊載入失敗（${audio.error?.code||'網路'}）；請重試播放或查看專案驗收紀錄`;loading=false;});
audio.addEventListener('ended',()=>{persist();if(index<book.chapters.length-1)selectChapter(index+1,true);});
window.addEventListener('pagehide',persist);document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();});
$('export-progress').addEventListener('click',()=>{persist();const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));link.download='reading-progress.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);});
try{
  const response=await fetch('data/books.json');if(!response.ok)throw Error(`HTTP ${response.status}`);catalog=await response.json();
  if(!catalog.books.length)throw Error('尚無已驗證書籍');
  $('book-select').replaceChildren(...catalog.books.map(b=>{const option=document.createElement('option');option.value=b.bookId;option.textContent=b.title;return option;}));
  selectBook(catalog.books[0].bookId);
}catch(e){$('book-title').textContent='書庫未能載入';$('status').textContent=e.message;}
