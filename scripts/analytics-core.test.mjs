import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code=ts.transpileModule(readFileSync(new URL('../src/analyticsCore.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const core={exports:{}};vm.runInNewContext(code,core);
const {sanitizeParams,cleanLabel,clickLabel,blockedEvent}=core.exports;
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
