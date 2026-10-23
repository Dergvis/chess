import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {pages,puzzleExamples} from './content.mjs';
import proxy from '../api/backend.mjs';
test('All required landing pages expose unique, indexable metadata and one H1',()=>{
 const titles=new Set();for(const slug of ['',...pages.map(p=>p.slug)]){const s=readFileSync('dist/'+(slug?slug+'/':'')+'index.html','utf8');assert.equal((s.match(/<h1(?:\s|>)/g)||[]).length,1);const title=s.match(/<title>(.*?)<\/title>/)[1];assert(!titles.has(title));titles.add(title);assert(s.includes('rel="canonical"'));assert(s.includes('application/ld+json'));assert(s.includes('name="description"'));assert(!/[А-Яа-я]/.test(s));}
});
test('Public SEO URLs use one host and internal game states stay out of the index',()=>{
 const slugs=['',...pages.map(p=>p.slug),'play'];const sitemap=readFileSync('dist/sitemap.xml','utf8');const config=JSON.parse(readFileSync('vercel.json','utf8'));
 for(const slug of slugs){const url='https://chezzies.app/'+(slug?slug+'/':'');const html=readFileSync('dist/'+(slug?slug+'/':'')+'index.html','utf8');assert(html.includes(`rel="canonical" href="${url}"`));assert(html.includes(`property="og:url" content="${url}"`));assert(sitemap.includes(`<loc>${url}</loc>`));}
 assert(!sitemap.includes('www.chezzies.app'));assert(!sitemap.includes('/play/home'));assert(readFileSync('dist/robots.txt','utf8').includes('Sitemap: https://chezzies.app/sitemap.xml'));
 assert(config.headers.some(rule=>rule.source.includes('home|login')&&rule.headers.some(header=>header.key==='X-Robots-Tag'&&header.value==='noindex, follow')));
 for(const rule of config.redirects){assert(rule.source.endsWith('/'),'redirect source must match Vercel trailingSlash URL');if(rule.source.startsWith('/play/'))assert.equal(rule.destination,'/play/');}
});
test('Homepage puzzle remains the actual production knight fork',()=>{const q=JSON.parse(readFileSync('src/quick-challenge.json'));const production=JSON.parse(readFileSync('src/world/challenges/prepared.json')).find(c=>c.id===q.id);assert.equal(q.fen,production.fen);assert.deepEqual(q.solutions,production.solutions);const b=new Chess(q.fen);b.move({from:'e4',to:'d6'});assert(b.inCheck());assert(b.isAttacked('c8','w'));});
test('Five article examples use playable positions from the production game',()=>{
 const catalogue=JSON.parse(readFileSync('src/world/challenges/prepared.json'));
 const html=readFileSync('dist/chess-puzzles-for-kids/index.html','utf8');
 assert.equal(puzzleExamples.length,5);
 for(const example of puzzleExamples){
  const position=catalogue.find(item=>item.id===example.id);
  assert(position,`Missing game challenge ${example.id}`);
  const move=position.solutions[0];
  assert(new Chess(position.fen).move({from:move.slice(0,2),to:move.slice(2,4)}),`Illegal solution ${example.id}`);
  assert(html.includes(`data-puzzle-id="${example.id}"`));
  assert(html.includes(`data-solution="${move}"`));
  assert(html.includes(`start-square" data-square="${move.slice(0,2)}"`));
  assert(html.includes(example.answer));
 }
 assert(html.includes('<details><summary>Show the answer</summary>'));
 assert(html.includes('<details><summary>Need a hint?</summary>'));
});
test('Learning pages contain useful static examples and the same real game art',()=>{
 const read=slug=>readFileSync(`dist/${slug}/index.html`,'utf8');
 for(const page of pages){
  const html=read(page.slug);
  assert(html.includes('class="article-hero-image"'),`Missing CHEZZIES world art on ${page.slug}`);
  assert(html.includes('/marketing/world-wide.webp'));
 }
 assert(read('how-to-play-chess-for-kids').includes('Meet the board and pieces'));
 assert(read('how-to-play-chess-for-kids').includes('/marketing/pieces/w-n.webp'));
 assert(read('chess-games-for-kids').includes('/marketing/gameplay-map.webp'));
 assert(read('chess-games-for-kids').includes('/marketing/gameplay-challenge.webp'));
 assert(read('learn-chess-for-kids').includes('Play a full game'));
 assert(read('online-chess-for-kids').includes('Guest progress stays in this browser'));
 assert(readFileSync('dist/robots.txt','utf8').includes('Allow: /'));
 for(const slug of ['',...pages.map(p=>p.slug),'play'])assert(!readFileSync(`dist/${slug?slug+'/':''}index.html`,'utf8').includes('noindex,nofollow'));
});
test('Account bridge never falls back to the Russian backend',async()=>{const before=process.env.CHEZZIES_API_ORIGIN;process.env.CHEZZIES_API_ORIGIN='https://chezzies.ru';process.env.API_BRIDGE_TOKEN='test';let status,data;const res={setHeader(){},status(s){status=s;return this},json(d){data=d;return this}};await proxy({url:'/api/auth/me',query:{route:'auth/me'},headers:{},method:'GET'},res);assert.equal(status,503);assert(data.error.includes('international'));if(before===undefined)delete process.env.CHEZZIES_API_ORIGIN;else process.env.CHEZZIES_API_ORIGIN=before;delete process.env.API_BRIDGE_TOKEN;});
test('Payment endpoints cannot reach the account bridge',async()=>{let status;const res={setHeader(){},status(s){status=s;return this},json(){return this}};await proxy({url:'/api/billing/create',query:{route:'billing/create'},headers:{},method:'POST'},res);assert.equal(status,404);});
