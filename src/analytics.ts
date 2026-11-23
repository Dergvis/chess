import {inject} from '@vercel/analytics';
import {trackGoogle} from './googleAnalytics';
export type SiteEvent = 'homepage_view'|'landing_view'|'play_click'|'game_start'|'puzzle_start'|'puzzle_complete'|'return_visit'|'signup_start'|'signup_complete';
const paths=['/','/play/','/chess-games-for-kids/','/online-chess-for-kids/','/learn-chess-for-kids/','/how-to-play-chess-for-kids/','/chess-puzzles-for-kids/','/parents/'];
const safePath=(value:string)=>value.startsWith('/play')?'/play/':value.startsWith('/es/play')?'/es/play/':paths.includes(value)||/^\/es\/([a-z-]+\/)?$/.test(value)?value:'/';
const events:SiteEvent[]=['homepage_view','landing_view','play_click','game_start','puzzle_start','puzzle_complete','return_visit','signup_start','signup_complete'];
function source(){try{const h=new URL(document.referrer).hostname;return h===location.hostname?'internal':/(^|\.)google\./.test(h)?'google':/(^|\.)bing\.com$/.test(h)?'bing':'referral';}catch{return 'direct';}}
export function track(event:SiteEvent){
 if(!events.includes(event))return;
 let attribution={source:source(),landing_page:safePath(location.pathname)};
 try{const saved=JSON.parse(sessionStorage.getItem('chezzies-attribution')||'null');if(saved&&['direct','internal','google','bing','referral'].includes(saved.source)&&paths.includes(saved.landing_page))attribution={source:saved.source,landing_page:saved.landing_page};else sessionStorage.setItem('chezzies-attribution',JSON.stringify(attribution));}catch{/* No storage dependency. */}
 const payload={event,...attribution};
 trackGoogle(event,attribution);
 // A local, bounded diagnostic buffer. A configured first-party collector may subscribe.
 try{const key='chezzies-analytics';const rows=JSON.parse(sessionStorage.getItem(key)||'[]');sessionStorage.setItem(key,JSON.stringify([...(Array.isArray(rows)?rows:[]),payload].slice(-100)));}catch{/* Storage may be disabled. */}
 window.dispatchEvent(new CustomEvent('chezzies:analytics',{detail:payload}));
 // Only the allowlisted anonymous envelope reaches the first-party collector.
 send('event',event,attribution);
}
// Anonymous first-party visit statistics for the owner's admin page: a random per-tab visit id,
// language version, device class and returning flag. No IP, e-mail, name or game content is sent.
function visitId(){try{let v=sessionStorage.getItem('chezzies-visit');if(!v||!/^[a-z0-9]{16}$/.test(v)){v=Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join('');sessionStorage.setItem('chezzies-visit',v);}return v;}catch{return '';}}
function send(kind:'event'|'screen'|'ping',name:string,attribution?:{source:string,landing_page:string}){
 if(typeof window==='undefined'||!['chezzies.app','www.chezzies.app'].includes(location.hostname)&&!location.hostname.endsWith('.vercel.app'))return;
 const v=visitId();if(!v)return;
 let ret=false;try{ret=localStorage.getItem('chezzies-visited')==='1'&&sessionStorage.getItem('chezzies-first')!=='1';}catch{/* ignore */}
 const a=attribution||{source:source(),landing_page:safePath(location.pathname)};
 const body={v,kind,name,lang:location.pathname==='/es'||location.pathname.startsWith('/es/')?'es':'en',path:safePath(location.pathname),source:a.source,device:matchMedia('(max-width: 767px)').matches?'mobile':'desktop',ret};
 void fetch('/api/site-events/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true,credentials:'omit'}).catch(()=>{});
}
const seenScreens=new Set<string>();
/** Each game section is reported once per visit: which sections a visitor opened, in order. */
export function trackScreen(screen:string){if(!/^[a-z_]{2,30}$/.test(screen)||seenScreens.has(screen))return;seenScreens.add(screen);send('screen',screen);}
export function trackGameEvent(name:string){if(/^[a-z_]{3,40}$/.test(name)&&!/premium|payment|paywall/.test(name))send('event','game:'+name);}
let pinging=false;
/** Time on site: a ping every 30 s while the tab is visible, at most 2 hours per visit. */
export function startVisitClock(){if(pinging||typeof document==='undefined')return;pinging=true;let n=0;setInterval(()=>{if(document.visibilityState==='visible'&&n<240){n++;send('ping','ping');}},30000);}
export function recordVisit(){try{if(!localStorage.getItem('chezzies-visited')&&!sessionStorage.getItem('chezzies-session'))sessionStorage.setItem('chezzies-first','1');if(localStorage.getItem('chezzies-visited')&&!sessionStorage.getItem('chezzies-session'))track('return_visit');localStorage.setItem('chezzies-visited','1');sessionStorage.setItem('chezzies-session','1');}catch{/* Play does not depend on analytics. */}startVisitClock();}

if (typeof window !== 'undefined' && ['chezzies.app','www.chezzies.app'].includes(location.hostname)) {
 inject({mode:'production',beforeSend(event){const url=new URL(event.url);url.search='';url.hash='';url.pathname=safePath(url.pathname);return {...event,url:url.toString()};}});
}

