import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code=ts.transpileModule(readFileSync(new URL('../src/analyticsCore.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const core={exports:{}};vm.runInNewContext(code,core);
const {sanitizeParams,cleanLabel,clickLabel,blockedEvent,createBoardTrail}=core.exports;
const el=(attrs={},text='',img=null)=>({getAttribute:k=>attrs[k]??null,textContent:text,querySelector:()=>img});

test('Game params keep only short codes, finite numbers and booleans',()=>{
 const p=sanitizeParams({id:'game-1700000000000-abc',level:3,opponent:'owl',demo:false,fen:'rnbqkbnr/pppppppp/8 w',text:'my name is Alex',email:'a@b.co',deep:{a:1},list:[1],inf:Infinity,nan:NaN,'bad key':'x',score:0.123456});
 assert.deepEqual({...p},{id:'game-1700000000000-abc',level:3,opponent:'owl',demo:false,score:0.123});
 assert.equal(sanitizeParams(null),undefined);assert.equal(sanitizeParams([1,2]),undefined);assert.equal(sanitizeParams({x:'has space'}),undefined);
 assert.equal(Object.keys(sanitizeParams(Object.fromEntries(Array.from({length:30},(_,i)=>['k'+i,i])))).length,12);
 assert.equal(sanitizeParams({s:'a'.repeat(41)}),undefined);
});
test('Payment-related events are blocked',()=>{
 for(const n of ['premium_started','premium_paywall_viewed','payment_done','subscription_x'])assert.ok(blockedEvent(n));
 assert.ok(!blockedEvent('game_started'));
});
test('Click labels prefer data-track, then aria-label, then visible text',()=>{
 assert.equal(clickLabel(el({'data-track':'play-hero','aria-label':'Play'},'Go')),'play-hero');
 assert.equal(clickLabel(el({'aria-label':'CHEZZIES home'},'CHEZZIES ↗')),'CHEZZIES home');
 assert.equal(clickLabel(el({},'  Start\n\n   game  →  ')),'Start game →');
 assert.equal(clickLabel(el({},'',{getAttribute:k=>k==='alt'?'Knight hero':null})),'Knight hero');
 assert.equal(clickLabel(el({},'x'.repeat(60))).length,40);
 assert.equal(clickLabel(el({},'')),'');
});
test('Labels that look personal are dropped',()=>{
 assert.equal(cleanLabel('Send to anna@example.com'),'');
 assert.equal(cleanLabel('Call 5551234'),'');
 assert.equal(cleanLabel('Level 3'),'Level 3');
});
test('Board trail: compact events, drag throttle, one-time hint, per-game cap',()=>{
 let t=0;const got=[];const trail=createBoardTrail('arena',(n,p)=>got.push([n,{...p}]),()=>t,10);
 trail.move({piece:'p',from:'e2',to:'e4',move:1,capture:false,fen:'rnbqkbnr/pppppppp w'});
 assert.deepEqual(got[0],['move_made',{piece:'p',from:'e2',to:'e4',move:1,capture:false,mode:'arena'}]);
 trail.reject('illegal_tap',{square:'e5',reason:'empty'});trail.reject('illegal_tap',{square:'e5',reason:'empty'});
 assert.equal(got.filter(g=>g[0]==='illegal_tap').length,1,'same tap within 1 s is dropped');
 t=1500;trail.reject('illegal_tap',{square:'e5',reason:'empty'});
 assert.equal(got.filter(g=>g[0]==='illegal_tap').length,2);
 assert.equal(trail.drag({piece:'n',from:'g1',to:'f3',how:'move'}),false);t+=500;
 assert.equal(trail.drag({piece:'n',from:'g1'}),false);t+=500;
 assert.equal(trail.drag({piece:'n',from:'g1'}),true,'third drag without a move shows the hint');
 assert.equal(got.filter(g=>g[0]==='drag_attempt').length,1,'drag_attempt at most once per 3 s');
 assert.equal(got.filter(g=>g[0]==='drag_hint_shown').length,1);
 t+=3000;assert.equal(trail.drag({piece:'n',from:'g1'}),false,'hint is one-time');
 assert.equal(got.at(-1)[1].n,4);
 for(let i=0;i<50;i++){t+=4000;trail.drag({piece:'p',from:'a2'});}
 assert.equal(got.length,10,'cap per game');
 const fresh=[];const t2=createBoardTrail('puzzle',(n)=>fresh.push(n),()=>0);
 t2.drag({});t2.drag({});t2.move({piece:'p',from:'a2',to:'a3'});t2.drag({});
 assert.ok(!fresh.includes('drag_hint_shown'),'a successful move resets the drag count');
});
