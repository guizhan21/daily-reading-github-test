// Presentation only: expanding the player or changing a skin never moves,
// replaces or reloads the native audio element.
export function initPlayerView(audio,{current,select,read,favorite}) {
 const $=id=>document.getElementById(id),panel=document.querySelector('.player');let expanded=false,returnFocus;
 function expand(open){
  if(open===expanded)return;
  expanded=open;panel.dataset.expanded=String(open);document.body.dataset.playerOpen=String(open);
  document.querySelector('.app-shell').inert=open;document.querySelector('.mobile-dock').inert=open;$('rate-picker').open=!open;panel.querySelector('.more-picker').open=!open;
  panel.setAttribute('role',open?'dialog':'region');panel.setAttribute('aria-label',open?'正在收聽':'音訊播放器');
  if(open){returnFocus=document.activeElement;panel.setAttribute('aria-modal','true');$('collapse-player').focus();}
  else{panel.removeAttribute('aria-modal');$('player-queue').hidden=true;$('player-queue-toggle').setAttribute('aria-expanded','false');if(returnFocus?.isConnected)returnFocus.focus();else ($('mini-queue').getClientRects().length?$('mini-queue'):$('expand-player')).focus();}
  $('expand-player').setAttribute('aria-expanded',String(open));
 }
 function update(){
  const value=current();if(!value)return;const {book,index}=value,ch=book.chapters[index];
  $('player-favorite').setAttribute('aria-pressed',String(value.favorite));$('player-favorite').textContent=value.favorite?'♥':'♡';$('player-release-link').href=book.releaseUrl;panel.dataset.playing=String(!audio.paused);panel.dataset.active=String(value.started||!audio.paused);$('player-mini-book').textContent=book.title;$('player-book').textContent=book.title;$('player-chapter').textContent=ch.title;
  if($('player-cover').getAttribute('src')!==book.cover){$('player-cover').src=book.cover;$('player-cover').alt=book.title+'的原封面';}
  const queue=$('player-queue');if(queue.dataset.queueBook!==book.bookId){queue.replaceChildren();for(const [i,c] of book.chapters.entries()){const button=document.createElement('button');button.textContent=String(i+1).padStart(2,'0')+'  '+c.title;button.dataset.chapter=c.chapterId;button.onclick=()=>select(i,book);queue.append(button);}queue.dataset.book=book.bookId;}
  for(const b of queue.children)b.setAttribute('aria-current',String(b.dataset.chapter===ch.chapterId));
 }
 $('player-favorite').onclick=()=>{favorite();update();};$('queue-card').onclick=()=>$('player-queue-toggle').click();$('mini-queue').onclick=()=>{update();expand(true);$('player-queue').hidden=false;$('player-queue-toggle').setAttribute('aria-expanded','true');};panel.querySelector('.player-art').onclick=()=>{update();expand(true);};$('now-title').onclick=()=>{update();expand(true);};
 $('expand-player').onclick=()=>{update();expand(true);};$('collapse-player').onclick=()=>expand(false);
 $('player-read').onclick=()=>{const value=current();expand(false);if(value)read(value.book,value.book.chapters[value.index].chapterId);};
 $('player-queue-toggle').onclick=()=>{const q=$('player-queue');q.hidden=!q.hidden;$('player-queue-toggle').setAttribute('aria-expanded',String(!q.hidden));};
 document.addEventListener('keydown',event=>{
  if(!expanded)return;
  if(event.key==='Escape'){event.preventDefault();expand(false);return;}
  if(event.key==='Tab'){const buttons=[...panel.querySelectorAll('button,a[href],input')].filter(e=>!e.disabled&&e.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
 });
 for(const event of ['play','pause','loadedmetadata','ended'])audio.addEventListener(event,update);
 return {expand,update};
}
