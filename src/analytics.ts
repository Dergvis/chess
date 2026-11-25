import {inject} from '@vercel/analytics';
import {trackGoogle} from './googleAnalytics';
import {sanitizeParams,clickLabel,blockedEvent,type Params,type TrailEvent} from './analyticsCore';
export type SiteEvent = 'homepage_view'|'landing_view'|'play_click'|'game_start'|'puzzle_start'|'puzzle_complete'|'return_visit'|'signup_start'|'signup_complete';
const paths=['/','/play/','/chess-games-for-kids/','/online-chess-for-kids/','/learn-chess-for-kids/','/how-to-play-chess-for-kids/','/chess-puzzles-for-kids/','/parents/','/how-do-chess-pieces-move/','/how-to-teach-a-child-chess/'];
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
// Anonymous first-party statistics for the owner's admin page: a random per-tab visit id, a random
// device id kept in this browser (owner decision; no name, e-mail or IP), language, device class,
// sanitized short event codes and button labels. Never input values or free text from the player.
const hex16=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join('');
function visitId(){try{let v=sessionStorage.getItem('chezzies-visit');if(!v||!/^[a-f0-9]{16}$/.test(v)){v=hex16();sessionStorage.setItem('chezzies-visit',v);}return v;}catch{return '';}}
let player:string|undefined;
/** Persistent anonymous player id; empty when storage is unavailable (stats then stay visit-only). */
function playerId(){if(player!==undefined)return player;try{let p=localStorage.getItem('chezzies-player');if(!p||!/^[a-f0-9]{16}$/.test(p)){p=hex16();localStorage.setItem('chezzies-player',p);}player=localStorage.getItem('chezzies-player')===p?p:'';}catch{player='';}return player;}
const collecting=()=>typeof window!=='undefined'&&(['chezzies.app','www.chezzies.app'].includes(location.hostname)||location.hostname.endsWith('.vercel.app'));
type Kind='event'|'screen'|'ping'|'click';
function send(kind:Kind,name:string,attribution?:{source:string,landing_page:string},extra?:{params?:Params,label?:string},beacon=false){
 if(!collecting())return;
 const v=visitId();if(!v)return;
 let ret=false;try{ret=localStorage.getItem('chezzies-visited')==='1'&&sessionStorage.getItem('chezzies-first')!=='1';}catch{/* ignore */}
 const a=attribution||{source:source(),landing_page:safePath(location.pathname)};
 const body=JSON.stringify({v,p:playerId(),kind,name,lang:location.pathname==='/es'||location.pathname.startsWith('/es/')?'es':'en',path:safePath(location.pathname),source:a.source,device:matchMedia('(max-width: 767px)').matches?'mobile':'desktop',ret,...(extra?.params?{params:extra.params}:{}),...(extra?.label?{label:extra.label}:{})});
 if(beacon&&navigator.sendBeacon?.('/api/site-events/',new Blob([body],{type:'application/json'})))return;
 try{void fetch('/api/site-events/',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit'}).catch(()=>{});}catch{/* ignore */}
}
const seenScreens=new Set<string>();
let currentScreen=(()=>{if(typeof location==='undefined')return 'site';const m=location.pathname.replace(/^\/es(?=\/|$)/,'').match(/^\/([a-z-]{2,40})\/?$/);return m?m[1]:location.pathname.replace(/^\/es/,'')==='/'||location.pathname==='/es'?'home':'site';})();
const googleBase=()=>({source:source(),landing_page:safePath(location.pathname)});
/** Each game section is reported once per visit: which sections a visitor opened, in order. */
export function trackScreen(screen:string){if(!/^[a-z_]{2,30}$/.test(screen))return;currentScreen=screen;if(seenScreens.has(screen))return;seenScreens.add(screen);send('screen',screen);trackGoogle('game_section_view',{...googleBase(),section:screen});}
// Game abandonment: a started game that has neither finished nor reported a result.
let game:{id:string,level?:number,opponent?:string,moves:number,reported:boolean}|null=null;
/** Called by the arena on every move so abandonment can say at which move the player left. */
export function noteGameMoves(n:number){if(game&&Number.isFinite(n))game.moves=n;}
function abandon(reason:'hidden'|'left'|'new_game'){
 if(!game||game.reported)return;game.reported=true;
 const params=sanitizeParams({id:game.id,level:game.level,opponent:game.opponent,moves:game.moves,reason,screen:currentScreen});
 send('event','game:game_abandoned',undefined,{params},reason!=='new_game');
 trackGoogle('game_abandoned',{...googleBase(),...withoutId(params)});
}
const withoutId=(p?:Params)=>{if(!p)return {};const {id:_id,...rest}=p;return rest;};
export function trackGameEvent(name:string,metadata?:unknown){
 if(!/^[a-z_]{3,40}$/.test(name)||blockedEvent(name))return;
 const params=sanitizeParams(metadata);
 if(name==='game_started'){abandon('new_game');game={id:String(params?.id||''),level:typeof params?.level==='number'?params.level:undefined,opponent:typeof params?.opponent==='string'?params.opponent:undefined,moves:0,reported:false};}
 if((name==='game_finished'||name==='game_result')&&game&&(!params?.id||params.id===game.id))game=null;
 send('event','game:'+name,undefined,{params});
 trackGoogle(name,{...googleBase(),...withoutId(params)});
}
/** Board trail (moves, rejected taps, drag attempts): first-party only, not sent to Google. Limits live in createBoardTrail. */
export function trackBoardEvent(name:TrailEvent,params:Params){send('event','game:'+name,undefined,{params});}
/** The anonymous device id, so a Help question can be linked to what this player did (empty if storage is off). */
export function anonymousPlayerId(){return typeof window==='undefined'?'':playerId();}
// Button and link clicks everywhere: one delegated listener, stable labels, throttled.
let clicksInstalled=false,clicks=0,lastLabel='',lastAt=0;
export function installClickTracking(){
 if(clicksInstalled||typeof document==='undefined')return;clicksInstalled=true;
 document.addEventListener('click',e=>{
  const el=(e.target as Element|null)?.closest?.('button,a,[role=button]');if(!el||el.closest('[data-track-off]'))return;
  // Board squares ("e4") are recorded by the board trail (moves, refused moves); here they only used up the limit.
  const label=clickLabel(el);if(!label||/^[a-h][1-8]$/.test(label))return;
  const now=Date.now();if((label===lastLabel&&now-lastAt<1000)||clicks>=1000)return;lastLabel=label;lastAt=now;clicks++;
  const params=sanitizeParams({screen:currentScreen});
  send('click','click',undefined,{params,label});
  trackGoogle('button_click',{...googleBase(),label,screen:currentScreen});
 },{capture:true,passive:true});
 const leave=(reason:'hidden'|'left')=>{if(game)abandon(reason);};
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')leave('hidden');else if(game?.reported)game.reported=false;/* came back: report again later with more moves; a finish clears it on the server */});
 window.addEventListener('pagehide',()=>leave('left'));
}
let pinging=false;
/** Time on site: a ping every 30 s while the tab is visible, at most 2 hours per visit. */
export function startVisitClock(){if(pinging||typeof document==='undefined')return;pinging=true;let n=0;setInterval(()=>{if(document.visibilityState==='visible'&&n<240){n++;send('ping','ping');}},30000);}
export function recordVisit(){try{if(!localStorage.getItem('chezzies-visited')&&!sessionStorage.getItem('chezzies-session'))sessionStorage.setItem('chezzies-first','1');if(localStorage.getItem('chezzies-visited')&&!sessionStorage.getItem('chezzies-session'))track('return_visit');localStorage.setItem('chezzies-visited','1');sessionStorage.setItem('chezzies-session','1');}catch{/* Play does not depend on analytics. */}startVisitClock();installClickTracking();}

if (typeof window !== 'undefined' && ['chezzies.app','www.chezzies.app'].includes(location.hostname)) {
 inject({mode:'production',beforeSend(event){const url=new URL(event.url);url.search='';url.hash='';url.pathname=safePath(url.pathname);return {...event,url:url.toString()};}});
}

