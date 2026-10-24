import {icon} from './icons.js';
export const appearanceKey = 'daily-reading-github:appearance:v1';
const choice = (value, values, fallback) => values.includes(value) ? value : fallback;
export function normalizeAppearance(value = {}) {
 if (!value || typeof value !== 'object') value = {};
 return {theme:choice(value.theme,['auto','light','dark'],'auto'),skin:choice(value.skin,['coast','forest','pixel'],'coast'),font:choice(value.font,['book','sans'],'sans'),size:choice(value.size,['normal','large','largest'],'normal'),motion:value.motion !== false};
}
export const resolvedTheme = (theme, dark) => theme === 'auto' ? dark ? 'dark' : 'light' : theme;
export const motionAllowed = (prefs, reduced, hidden = false) => prefs.motion && !reduced && !hidden;

export function initAppearance() {
 const root=document.documentElement,dark=matchMedia('(prefers-color-scheme: dark)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let prefs;try{prefs=normalizeAppearance(JSON.parse(localStorage.getItem(appearanceKey)));}catch{prefs=normalizeAppearance();}
 const panel=document.getElementById('appearance-settings'),status=document.getElementById('appearance-status');
 function apply(save=false) {
  const theme=resolvedTheme(prefs.theme,dark.matches),motion=motionAllowed(prefs,reduced.matches);
  root.dataset.theme=theme;root.dataset.skin=prefs.skin;root.dataset.font=prefs.font;root.dataset.readingSize=prefs.size;root.dataset.motion=motion?'on':'off';
  document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#14252b':'#e8efdf';
  for(const button of document.querySelectorAll('[data-preference]'))button.setAttribute('aria-pressed',String(prefs[button.dataset.preference]===button.dataset.value));
  const toggle=document.getElementById('theme-toggle');toggle.innerHTML=icon(theme==='dark'?'sun':'moon')+'<span>'+(theme==='dark'?'白天':'夜晚')+'</span>';toggle.setAttribute('aria-label',theme==='dark'?'切換白天模式':'切換夜晚模式');toggle.setAttribute('aria-pressed',String(theme==='dark'));
  for(const mode of ['light','dark'])document.getElementById('reader-'+mode).setAttribute('aria-pressed',String(theme===mode));
  const motionButton=document.getElementById('motion-toggle');motionButton.setAttribute('aria-pressed',String(motion));motionButton.textContent=motion?'動態開啟':'動態關閉';motionButton.disabled=reduced.matches;
  status.textContent=reduced.matches?'依系統偏好減少動態；播放不受影響。':'外觀設定只儲存在目前瀏覽器。';
  if(save)try{localStorage.setItem(appearanceKey,JSON.stringify(prefs));}catch{status.textContent='這次設定已套用，瀏覽器暫時無法保存。';}
  document.dispatchEvent(new CustomEvent('appearancechange',{detail:{...prefs,theme,motion}}));
 }
 for(const button of document.querySelectorAll('[data-preference]'))button.onclick=()=>{prefs=normalizeAppearance({...prefs,[button.dataset.preference]:button.dataset.value,...(button.dataset.preference==='skin'?{theme:button.dataset.value==='pixel'?'dark':'light'}:{})});apply(true);};
 document.getElementById('theme-toggle').onclick=()=>{prefs.theme=resolvedTheme(prefs.theme,dark.matches)==='dark'?'light':'dark';apply(true);};
 document.getElementById('motion-toggle').onclick=()=>{prefs.motion=!prefs.motion;apply(true);};
 dark.addEventListener('change',()=>apply());reduced.addEventListener('change',()=>apply());
 window.addEventListener('storage',e=>{if(e.key===appearanceKey){try{prefs=normalizeAppearance(JSON.parse(e.newValue));}catch{prefs=normalizeAppearance();}apply();}});
 document.addEventListener('click',e=>{if(panel.open&&!panel.contains(e.target)&&!e.target.closest('#dock-settings'))panel.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.open){panel.open=false;(matchMedia('(max-width:560px)').matches?document.getElementById('dock-settings'):panel.querySelector('summary')).focus();}});
 apply();return {get:()=>({...prefs}),set:values=>{prefs=normalizeAppearance({...prefs,...values});apply(true);}};
}
