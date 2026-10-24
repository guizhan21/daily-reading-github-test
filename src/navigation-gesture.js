// An intentional left swipe goes up one level. Native edge navigation, scrolling,
// selections and controls retain ownership of their own gestures.
export function isBackSwipe(start,end) {
 const dx=end.x-start.x,dy=end.y-start.y,elapsed=end.time-start.time;
 return elapsed>=70&&elapsed<=800&&dx<=-80&&Math.abs(dx)>=Math.abs(dy)*2.5&&Math.abs(dy)<=55;
}
export function bindBackSwipe(root,back) {
 let start=null;
 const blocked='button,a,input,textarea,select,summary,[contenteditable], [role="slider"], [data-no-swipe]';
 root.addEventListener('touchstart',event=>{
  start=null;if(event.touches.length!==1||event.target.closest(blocked)||getSelection()?.toString())return;
  const touch=event.touches[0],width=innerWidth;
  if(width>800||touch.clientX<24||touch.clientX>width-24)return;
  // A horizontally scrollable code/table region must not trigger navigation.
  for(let e=event.target;e&&e!==root;e=e.parentElement)if(e.scrollWidth>e.clientWidth+2&&['auto','scroll'].includes(getComputedStyle(e).overflowX))return;
  start={x:touch.clientX,y:touch.clientY,time:performance.now(),scroll:scrollY};
 },{passive:true});
 root.addEventListener('touchend',event=>{
  const previous=start;start=null;if(!previous||event.touches.length||event.changedTouches.length!==1||Math.abs(scrollY-previous.scroll)>12||getSelection()?.toString())return;
  const touch=event.changedTouches[0];if(isBackSwipe(previous,{x:touch.clientX,y:touch.clientY,time:performance.now()}))back();
 },{passive:true});
 root.addEventListener('touchcancel',()=>{start=null;},{passive:true});
}
