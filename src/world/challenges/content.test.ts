import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {candidateMoves,forcedMateMoves,matchesObjective,pins,materialFor} from './acceptance';
import {applyUci} from '../engine';
import {canonicalBoard} from '../trainingRules';
import {exercisePool} from './catalog';
import type {Exercise} from './types';
const exercise=(fen:string,objective:Exercise['objective']):Exercise=>({id:'test',family:'test',skill:'mate',type:'MOVE',chapter:1,difficulty:2,fen,player:new Chess(fen).turn(),solutions:[],prompt:'',explanation:'',goal:{kind:'move'},tags:[],objective});
const mate=exercise('7k/8/5K2/6Q1/8/8/8/8 w - - 0 1',{kind:'mate',moves:1});
const alternatives=forcedMateMoves(mate.fen,1);
assert(alternatives.length>1,'fixture must have multiple genuine mates');
mate.solutions=[alternatives[0]];
const proof=candidateMoves(mate,400);
assert.deepEqual(new Set(proof.acceptable),new Set(alternatives),'all mates accepted although JSON contained one');
assert(proof.acceptable.every(m=>{const b=new Chess(mate.fen);applyUci(b,m);return b.isCheckmate();}));
console.log('PASS all correct mates, including answers absent from JSON');
const mate2=exercise('7k/8/5K2/8/8/8/R7/8 w - - 0 1',{kind:'mate',moves:2});
assert(forcedMateMoves(mate2.fen,2).length>0);
for(const first of forcedMateMoves(mate2.fen,2)){
 const after=new Chess(mate2.fen);applyUci(after,first);
 if(after.isCheckmate())continue;
 for(const reply of after.moves({verbose:true})){
  const b=new Chess(after.fen());b.move(reply);assert(forcedMateMoves(b.fen(),1).length>0,'mate in 2 must survive EVERY reply');
 }
}
assert(!matchesObjective(mate.fen,'g5g4',{kind:'mate',moves:1}));
assert(!matchesObjective('7k/8/8/8/8/8/8/3Q2K1 w - - 0 1','d1h5',{kind:'discovered'}),'ordinary queen check is not a discovered double attack');
assert(pins(new Chess('4k3/4q3/8/8/8/8/8/4RK2 w - - 0 1'),'w').length===1);
console.log('PASS exact forced-mate length, objective constraints and real pin geometry');
if(process.argv.includes('--unit'))process.exit(0);
const boardKeys=new Set<string>();
for(const c of exercisePool){
 const key=canonicalBoard(c.fen);assert(!boardKeys.has(key),'duplicate board '+c.id);boardKeys.add(key);
 const b=new Chess(c.fen);assert.equal(b.turn(),c.player,c.id);
 for(const m of c.solutions){const n=new Chess(c.fen);applyUci(n,m);}
 if(c.type==='BOSS'||c.type==='MINI_GAME'){
  assert(!['move','targets'].includes(c.goal.kind),c.id+' must be a real match');
  assert('minMoves' in c.goal&&c.goal.minMoves>=3&&c.goal.maxMoves<=8,c.id+' duration');
 }
 if(c.line){
  const n=new Chess(c.fen),initial=materialFor(n,c.player);let observed=false,own=0;
  for(const m of c.line){if(n.turn()===c.player){own++;if(c.goal.kind==='material'&&c.goal.requireObjective&&matchesObjective(n.fen(),m,c.goal.requireObjective))observed=true;}applyUci(n,m);}
  if(c.goal.kind==='material'){assert(materialFor(n,c.player)>=initial+c.goal.gain,c.id);assert(!c.goal.requireObjective||observed,c.id+' motif');}
  if(c.goal.kind==='mate')assert(n.isCheckmate()&&n.turn()!==c.player,c.id+' mate');
  if(c.goal.kind==='survive')assert(!n.isCheckmate()&&materialFor(n,c.player)>=initial-c.goal.maxLoss,c.id+' survival');
 }
}
for(const skill of ['fork','mate','pin','defense','doubleAttack']){
 const pool=exercisePool.filter(c=>c.skill===skill);
 assert(pool.length>=30&&pool.length<=50,skill+' needs 30–50 unique scenarios');
 assert.equal(pool.filter(c=>c.type==='BOSS').length,4,skill+' four guardians');
 assert(pool.filter(c=>c.type==='MINI_GAME').length>=3,skill+' at least three mini-matches');
 for(const t of ['MOVE','CHOOSE_SQUARE','CHOOSE_MOVE','FIND_THREAT','DEFEND','MULTI_STEP'])assert(pool.some(c=>c.type===t),skill+' '+t);
 assert(pool.filter(c=>c.type==='MOVE').length<pool.length*0.5,skill+' ordinary move dominance');
}
console.log('PASS unique content, real continuations, all five complete fortresses');
