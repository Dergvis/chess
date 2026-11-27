import { Chess, type Color, type Square } from 'chess.js';
import { applyUci, search, targets, uci, values } from '../engine';
import { trainingAnswers } from '../trainingRules';
import type { Exercise, Objective } from './types';

export const other = (c: Color): Color => c === 'w' ? 'b' : 'w';
export function materialFor(b: Chess, color: Color) {
  return b.board().flat().reduce((n,p) => n + (p && p.type !== 'k' ? (p.color === color ? 1 : -1)*values[p.type] : 0),0);
}
// Absolute AND relative pins. The front piece must be cheaper than the rear piece.
export function pins(b: Chess, attacker: Color) {
  const result: { source: string; front: string; rear: string }[] = [];
  for (const p of b.board().flat()) {
    if (!p || p.color !== attacker || !'brq'.includes(p.type)) continue;
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      if (p.type === 'b' && (!dx || !dy) || p.type === 'r' && dx && dy) continue;
      let front: Square | null = null;
      for (let x=p.square.charCodeAt(0)-97+dx,y=+p.square[1]-1+dy;x>=0&&x<8&&y>=0&&y<8;x+=dx,y+=dy) {
        const s=(String.fromCharCode(97+x)+(y+1)) as Square, q=b.get(s);
        if (!q) continue;
        if(q.color===attacker) break;
        if (!front) {front=s;continue;}
        if(values[q.type]>values[b.get(front)!.type]) result.push({source:p.square,front,rear:s});
        break;
      }
    }
  }
  return result;
}
// Exact bounded AND/OR search: all legal replies, no centipawn substitute for mate.
export function forcedMateMoves(fen: string, moves: number, nodeLimit=350000): string[] {
  const b=new Chess(fen), player=b.turn(), memo=new Map<string,boolean>();
  let nodes=0;
  function win(left:number):boolean {
    if (++nodes>nodeLimit) throw Error('Mate proof needs more time');
    if(b.isCheckmate()) return b.turn()!==player;
    if(b.isDraw()||left<=0) return false;
    const key=b.fen().split(' ').slice(0,4).join(' ')+'|'+left;
    const known=memo.get(key);if(known!==undefined)return known;
    const own=b.turn()===player;
    const list=b.moves({verbose:true}).sort((a,z)=>(z.san.includes('#')?100: z.san.includes('+')?10:0)-(a.san.includes('#')?100:a.san.includes('+')?10:0));
    for(const m of list){b.move(m);let yes;try{yes=win(left-1);}finally{b.undo();}if(own?yes:!yes){memo.set(key,own);return own;}}
    memo.set(key,!own);return !own;
  }
  const accepted:string[]=[];
  for(const m of b.moves({verbose:true})) {b.move(m);try{if(win(moves*2-2))accepted.push(uci(m));}finally{b.undo();}}
  return accepted;
}
export function hasMateInOne(b:Chess) {return b.moves({verbose:true}).some(m=>m.san.includes('#'));}
export function inferObjective(c:Exercise):Objective {
  if(c.objective)return c.objective;
  if(c.tags.includes('prevent-fork'))return {kind:'defendFork'};
  if(c.skill==='mate')return {kind:'mate',moves:1};
  if(c.skill==='fork')return {kind:'fork'};
  if(c.skill==='doubleAttack')return {kind:'doubleAttack'};
  if(c.skill==='pin')return {kind:'pin'};
  return {kind:'best'};
}
export function matchesObjective(fen:string,move:string,o:Objective):boolean {
  const before=new Chess(fen),color=before.turn(),enemy=other(color),after=new Chess(fen);
  let m;try{m=applyUci(after,move);}catch{return false;}
  switch(o.kind){
    case 'mate': return o.moves===1 ? after.isCheckmate() : forcedMateMoves(fen,o.moves).includes(move);
    case 'fork': case 'doubleAttack': {
      if(o.kind==='doubleAttack' && discoveredAttack(before,after,m.to,color))return true;
      const victims=targets(after,m.to).filter(s=>{const p=after.get(s);return p&&p.color===enemy&&(p.type==='k'||values[p.type]>=(m.piece==='p'?100:320));});
      return victims.length>=2 && (o.kind==='doubleAttack'?m.piece!=='n':'np'.includes(m.piece)) && !after.moves({verbose:true}).some(r=>r.to===m.to);
    }
    case 'discovered':return discoveredAttack(before,after,m.to,color);
    case 'pin':return pins(after,color).some(p=>!pins(before,color).some(q=>q.front===p.front&&q.rear===p.rear&&q.source===p.source));
    case 'unpin':return pins(before,enemy).length>0&&pins(after,enemy).length<pins(before,enemy).length;
    case 'exploitPin':return pins(before,color).some(p=>p.front===m.to&&!!m.captured || (targets(after,m.to).includes(p.front as Square)&&!targets(before,m.from).includes(p.front as Square)) || !!m.captured && targets(before,p.front as Square).includes(m.to));
    case 'escapeCheck':return before.inCheck(); // chess.js already rejected every move leaving our king in check.
    case 'defendMate':return !hasMateInOne(after)&&!after.isCheckmate();
    case 'defendFork':return trainingAnswers({fen:after.fen(),skill:'fork',objective:'safeFork'}).length===0;
    case 'defendDouble':return !after.moves({verbose:true}).some(r=>matchesObjective(after.fen(),uci(r),{kind:'doubleAttack'}));
    case 'defendPin':return !after.moves({verbose:true}).some(reply=>{const n=new Chess(after.fen());n.move(reply);return pins(n,enemy).some(p=>!pins(after,enemy).some(q=>q.front===p.front&&q.rear===p.rear));});
    case 'save': {
      const square=(m.from===o.square?m.to:o.square) as Square,p=after.get(square);
      return !!p&&p.color===color&&(!after.isAttacked(square,enemy)||after.isAttacked(square,color));
    }
    case 'capture':return !!m.captured&&(!o.square||m.to===o.square)&&(!after.isAttacked(m.to,enemy)||values[m.captured]>=values[m.piece]);
    case 'best':return true;
  }
}
function discoveredAttack(before:Chess,after:Chess,to:Square,color:Color){
  const newly=after.board().flat().filter(p=>p&&p.color===color&&p.square!==to&&before.get(p.square)?.color===color&&'brq'.includes(p.type)).filter(p=>targets(after,p!.square).some(s=>{const q=after.get(s);return q&&q.color!==color&&!targets(before,p!.square).includes(s);}));
  return newly.some(p=>targets(after,p!.square).some(s=>after.get(s)?.type==='k'))&&targets(after,to).some(s=>{const q=after.get(s);return q&&q.color!==color&&q.type!=='k';});
}
export interface CandidateProof {bestMove:string;acceptable:string[];depth:number;ranked:{move:string;score:number;delta:number;motif:boolean}[];objective:Objective;}
export function candidateMoves(c:Exercise,timeMs=650):CandidateProof {
  const objective=inferObjective(c), evaluated=search(c.fen,{depth:3,timeMs});
  const best=evaluated.ranked[0]?.score||0;
  let exact:string[]|undefined;
  if(objective.kind==='mate')exact=forcedMateMoves(c.fen,objective.moves);
  const ranked=evaluated.ranked.map(r=>({...r,delta:best-r.score,motif:exact?exact.includes(r.move):matchesObjective(c.fen,r.move,objective)}));
  // Exact goal proofs accept all mates; positional alternatives must both fit the
  // teaching objective and stay within half a pawn of the best evaluated move.
  const acceptable=ranked.filter(r=>r.motif&&(exact!==undefined||r.delta<=50)).map(r=>r.move);
  // A bounded live search cannot disprove an offline verified line. Preserve only
  // answers from the validated content package, never arbitrary personal JSON.
  if(c.sourceRef?.startsWith('validated:'))for(const move of c.solutions)if(!acceptable.includes(move)&&ranked.some(r=>r.move===move&&r.motif))acceptable.push(move);
  return {bestMove:evaluated.ranked[0]?.move||'',acceptable,depth:evaluated.depth,ranked,objective};
}
