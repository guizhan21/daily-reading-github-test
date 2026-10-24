// An intentional left swipe goes up one level. Native edge navigation, scrolling,
// selections and value controls retain ownership of their own gestures.
export function isBackSwipe(start,end) {
 const dx=end.x-start.x,dy=end.y-start.y,elapsed=end.time-start.time;
 return elapsed>=24&&elapsed<=800&&dx<=-80&&Math.abs(dx)>=Math.abs(dy)*2.5&&Math.abs(dy)<=55;
}
export function bindBackSwipe(root,back) {
 let start=null,suppressClickUntil=0;
 const blocked='input,textarea,select,[contenteditable],[role="slider"],[data-no-swipe]';
 const scrolled=previous=>Math.abs(scrollY-previous.scroll)>12||previous.containers.some(({element,x,y})=>Math.abs(element.scrollLeft-x)>12||Math.abs(element.scrollTop-y)>12);
 const point=(list,id)=>[...list].find(t=>t.identifier===id);
 root.addEventListener('touchstart',event=>{
  start=null;suppressClickUntil=0;if(event.touches.length!==1||event.target.closest(blocked)||getSelection()?.toString())return;
  const touch=event.touches[0],width=innerWidth;
  if(width>800||touch.clientX<24||touch.clientX>width-24)return;
  // A horizontally scrollable code/table region must not trigger navigation.
  const containers=[];
  for(let e=event.target;e;e=e.parentElement){
   if(e.scrollWidth>e.clientWidth+2&&['auto','scroll'].includes(getComputedStyle(e).overflowX))return;
   containers.push({element:e,x:e.scrollLeft,y:e.scrollTop});if(e===root)break;
  }
  start={x:touch.clientX,y:touch.clientY,id:touch.identifier,time:performance.now(),scroll:scrollY,containers};
 },{passive:true});
 root.addEventListener('touchmove',event=>{
  if(!start)return;const touch=point(event.touches,start.id);
  if(event.touches.length!==1||!touch||scrolled(start)){start=null;return;}
  const dx=Math.abs(touch.clientX-start.x),dy=Math.abs(touch.clientY-start.y);
  // Once the gesture belongs to vertical reading, do not reinterpret its tail.
  if(dy>14&&dy>dx)start=null;
 },{passive:true});
 root.addEventListener('touchend',event=>{
  const previous=start;start=null;if(!previous||event.touches.length||event.changedTouches.length!==1||scrolled(previous)||getSelection()?.toString())return;
  const touch=point(event.changedTouches,previous.id);
  if(!touch||!isBackSwipe(previous,{x:touch.clientX,y:touch.clientY,time:performance.now()}))return;
  // Ordinary links/buttons are valid swipe surfaces. Cancel only a recognized
  // swipe's compatibility click so returning cannot also select a chapter/link.
  if(event.cancelable)event.preventDefault();suppressClickUntil=performance.now()+500;back();
 },{passive:false});
 root.addEventListener('click',event=>{
  if(!event.detail||performance.now()>suppressClickUntil)return;
  suppressClickUntil=0;event.preventDefault();event.stopImmediatePropagation();
 },{capture:true});
 root.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'||event.pointerType==='pen')suppressClickUntil=0;},{passive:true});
 root.addEventListener('touchcancel',()=>{start=null;},{passive:true});
}
