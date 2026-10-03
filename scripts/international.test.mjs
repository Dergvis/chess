import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {pages} from './content.mjs';
import proxy from '../api/backend.mjs';
test('All required landing pages expose unique, indexable metadata and one H1',()=>{
 const titles=new Set();for(const slug of ['',...pages.map(p=>p.slug)]){const s=readFileSync('dist/'+(slug?slug+'/':'')+'index.html','utf8');assert.equal((s.match(/<h1(?:\s|>)/g)||[]).length,1);const title=s.match(/<title>(.*?)<\/title>/)[1];assert(!titles.has(title));titles.add(title);assert(s.includes('rel="canonical"'));assert(s.includes('application/ld+json'));assert(s.includes('name="description"'));assert(!/[А-Яа-я]/.test(s));}
});
test('Homepage puzzle remains the actual production knight fork',()=>{const q=JSON.parse(readFileSync('src/quick-challenge.json'));const production=JSON.parse(readFileSync('src/world/challenges/prepared.json')).find(c=>c.id===q.id);assert.equal(q.fen,production.fen);assert.deepEqual(q.solutions,production.solutions);const b=new Chess(q.fen);b.move({from:'e4',to:'d6'});assert(b.inCheck());assert(b.isAttacked('c8','w'));});
test('Account bridge never falls back to the Russian backend',async()=>{const before=process.env.CHEZZIES_API_ORIGIN;process.env.CHEZZIES_API_ORIGIN='https://chezzies.ru';process.env.API_BRIDGE_TOKEN='test';let status,data;const res={setHeader(){},status(s){status=s;return this},json(d){data=d;return this}};await proxy({url:'/api/auth/me',query:{route:'auth/me'},headers:{},method:'GET'},res);assert.equal(status,503);assert(data.error.includes('international'));if(before===undefined)delete process.env.CHEZZIES_API_ORIGIN;else process.env.CHEZZIES_API_ORIGIN=before;delete process.env.API_BRIDGE_TOKEN;});
test('Payment endpoints cannot reach the account bridge',async()=>{let status;const res={setHeader(){},status(s){status=s;return this},json(){return this}};await proxy({url:'/api/billing/create',query:{route:'billing/create'},headers:{},method:'POST'},res);assert.equal(status,404);});
