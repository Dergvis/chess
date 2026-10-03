export type SiteEvent = 'homepage_view'|'landing_view'|'play_click'|'game_start'|'puzzle_start'|'puzzle_complete'|'return_visit'|'signup_start'|'signup_complete';
const paths=['/','/play/','/chess-games-for-kids/','/online-chess-for-kids/','/learn-chess-for-kids/','/how-to-play-chess-for-kids/','/chess-puzzles-for-kids/','/parents/'];
const safePath=(value:string)=>value.startsWith('/play')?'/play/':paths.includes(value)?value:'/';
const events:SiteEvent[]=['homepage_view','landing_view','play_click','game_start','puzzle_start','puzzle_complete','return_visit','signup_start','signup_complete'];
function source(){try{const h=new URL(document.referrer).hostname;return h===location.hostname?'internal':/(^|\.)google\./.test(h)?'google':/(^|\.)bing\.com$/.test(h)?'bing':'referral';}catch{return 'direct';}}
export function track(event:SiteEvent){
 if(!events.includes(event))return;
 let attribution={source:source(),landing_page:safePath(location.pathname)};
 try{const saved=JSON.parse(sessionStorage.getItem('chezzies-attribution')||'null');if(saved&&['direct','internal','google','bing','referral'].includes(saved.source)&&paths.includes(saved.landing_page))attribution={source:saved.source,landing_page:saved.landing_page};else sessionStorage.setItem('chezzies-attribution',JSON.stringify(attribution));}catch{/* No storage dependency. */}
 const payload={event,...attribution};
 // A local, bounded diagnostic buffer. A configured first-party collector may subscribe.
 try{const key='chezzies-analytics';const rows=JSON.parse(sessionStorage.getItem(key)||'[]');sessionStorage.setItem(key,JSON.stringify([...(Array.isArray(rows)?rows:[]),payload].slice(-100)));}catch{/* Storage may be disabled. */}
 window.dispatchEvent(new CustomEvent('chezzies:analytics',{detail:payload}));
 // Only the allowlisted anonymous envelope reaches the first-party collector.
 void fetch('/api/site-events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true,credentials:'omit'}).catch(()=>{});
}
export function recordVisit(){try{if(localStorage.getItem('chezzies-visited')&&!sessionStorage.getItem('chezzies-session'))track('return_visit');localStorage.setItem('chezzies-visited','1');sessionStorage.setItem('chezzies-session','1');}catch{/* Play does not depend on analytics. */}}
