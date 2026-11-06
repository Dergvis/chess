// Read-only production check. Run: node scripts/audit-live.mjs
const host='https://chezzies.app';
const paths=['/','/play/','/chess-games-for-kids/','/online-chess-for-kids/','/learn-chess-for-kids/','/how-to-play-chess-for-kids/','/chess-puzzles-for-kids/','/parents/'];
const field=(html,regex)=>html.match(regex)?.[1]||'';
async function chain(url){const hops=[];for(let n=0;n<6;n++){const r=await fetch(url,{redirect:'manual'});hops.push({url,status:r.status,location:r.headers.get('location'),robots:r.headers.get('x-robots-tag')});if(![301,302,303,307,308].includes(r.status))return {hops,response:r};url=new URL(r.headers.get('location'),url).href;}throw Error('Too many redirects: '+url);}
const sitemap=await (await fetch(host+'/sitemap.xml')).text();
const robots=await (await fetch(host+'/robots.txt')).text();
const result=[];
for(const path of paths){const {hops,response}=await chain(host+path),html=await response.text();result.push({path,hops,title:field(html,/<title>([^<]*)<\/title>/i),description:field(html,/<meta name="description" content="([^"]*)"/i),h1:field(html,/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g,'').trim(),canonical:field(html,/<link rel="canonical" href="([^"]*)"/i),robots:field(html,/<meta name="robots" content="([^"]*)"/i),inSitemap:sitemap.includes(`<loc>${host+path}</loc>`),internalLinks:(html.match(/href="\/(?!\/)[^"]*"/g)||[]).length,jsonLd:(html.match(/<script type="application\/ld\+json">/g)||[]).length,htmlBytes:Buffer.byteLength(html)});}
const redirects={};for(const url of ['http://chezzies.app/','https://www.chezzies.app/','http://www.chezzies.app/','https://www.chezzies.app/play/home','https://chezzies.app/play/home']){try{const {hops}=await chain(url);redirects[url]=hops;}catch(e){redirects[url]={error:e.message};}}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),robots,sitemapUrls:[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]),pages:result,redirects},null,2));
