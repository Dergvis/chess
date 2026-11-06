import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Chess} from 'chess.js';
import {pages} from './content-es.mjs';
import {puzzleSetsEs,puzzleCount,sanEs} from './puzzles.mjs';
import {translateSource,translateJson} from './i18n/vite-locale.mjs';

const read=p=>readFileSync('dist/'+p,'utf8');
const esPaths=['es/','es/play/',...pages.map(p=>`es/${p.slug}/`)];

test('Spanish pages are indexable, in Spanish and paired with English via hreflang',()=>{
 for(const path of esPaths){
  const html=read(path+'index.html');
  assert(html.includes('<html lang="es">'),path);
  assert(html.includes(`rel="canonical" href="https://chezzies.app/${path}"`),path);
  assert(html.includes('hreflang="es" href="https://chezzies.app/'+path+'"'),path);
  assert(html.includes('hreflang="en"')&&html.includes('hreflang="x-default"'),path);
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,path);
 }
 for(const p of pages){const en=read(`${p.en}/index.html`);assert(en.includes(`hreflang="es" href="https://chezzies.app/es/${p.slug}/"`),p.en);}
 assert(read('index.html').includes('class="lang-switch" href="/es/"'));
 const sitemap=read('sitemap.xml');for(const path of esPaths)assert(sitemap.includes(`<loc>https://chezzies.app/${path}</loc>`),path);
});

test('Spanish puzzle page has every puzzle with a legal answer and Spanish notation',()=>{
 const html=read('es/problemas-de-ajedrez-para-ninos/index.html');
 assert.equal((html.match(/class="example-card puzzle-card"/g)||[]).length,puzzleCount);
 for(const set of puzzleSetsEs)for(const p of set.puzzles){
  const m=new Chess(p.fen).move({from:p.solution.slice(0,2),to:p.solution.slice(2,4),promotion:'q'});assert(m,p.id);
  assert(p.answer.includes(sanEs(m.san)),p.id);assert(!/\b(The|White|Black|moves|takes)\b/.test(p.task+p.hint+p.answer),p.id);
 }
 assert.equal(sanEs('Nxe4+'),'Cxe4+');assert.equal(sanEs('Qd5+'),'Dd5+');assert.equal(sanEs('Kh4'),'Rh4');
});

test('The Spanish game bundle is translated and the English bundle is untouched',()=>{
 const esPlay=read('es/play/index.html'),enPlay=read('play/index.html');
 const bundle=html=>read(html.match(/src="\/(assets\/[^"]+\.js)"/)[1]);
 const es=bundle(esPlay),en=bundle(enPlay);
 for(const s of ['Fortaleza del Jaque Mate','¡Elige a tu héroe!','Juegan las blancas'])assert(es.includes(s),s);
 for(const s of ['Checkmate Fortress','Choose your hero!'])assert(en.includes(s),s);
 assert(!en.includes('Fortaleza del Jaque Mate'));
});

test('Locale plugin replaces display strings but keeps object keys, imports and unknown text',()=>{
 const dict=new Map([['Hello world','Hola mundo'],['Fork','Horquilla']]);
 const src="import x from 'Fork';\nconst o={'Fork':1,label:'Fork'};const a=`Hello world`;const j=<b> Hello world </b>;const k='Other text';";
 const out=translateSource(src,'x.tsx',dict).code;
 assert(out.includes("from 'Fork'"));assert(out.includes("'Fork':1"));assert(out.includes('label:"Horquilla"'));
 assert(out.includes('`Hola mundo`'));assert(out.includes('<b> Hola mundo </b>'));assert(out.includes("'Other text'"));
 const json=translateJson(JSON.stringify({id:'Fork',prompt:'Fork',list:['Hello world']}),dict).code;
 assert.deepEqual(JSON.parse(json),{id:'Fork',prompt:'Horquilla',list:['Hola mundo']});
});

test('Every challenge explanation used on the site has a Spanish translation',()=>{
 const es=JSON.parse(readFileSync('docs/i18n/es.json','utf8'));
 const prepared=JSON.parse(readFileSync('src/world/challenges/prepared.json','utf8'));
 for(const c of prepared)if(c.goal?.kind==='move'&&!c.hidden){assert(es[c.explanation],c.id);}
 assert(readdirSync('dist/es').includes('padres'));
});
