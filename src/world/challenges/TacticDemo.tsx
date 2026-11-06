import {useEffect,useState} from 'react';
import {Chess,type Square} from 'chess.js';
import {applyUci,targets} from '../engine';
import type {TaskView} from './presentation';
import {pins} from './acceptance';
export const tacticExamples={
 mate:{fen:'k7/4Q3/2K5/8/8/8/8/8 w - - 0 1',move:'e7b7',steps:["The queen moves closer to the king.","The king is in check and looks for an escape.","The queen covers a7 and b8. The white king protects the queen. Checkmate."]},
 fork:{fen:'8/4k3/8/8/8/2N1r3/8/6K1 w - - 0 1',move:'c3d5',steps:["The knight moves.","One piece attacks two targets.","The king must escape check, leaving the rook under attack."]},
 pin:{fen:'3k4/8/8/3n4/8/8/8/R5K1 w - - 0 1',move:'a1d1',steps:["The rook moves onto the king’s file.","The knight stands between the rook and the king.","If the knight moves away, its king will be in check."]},
 capture:{fen:'k7/8/8/3b4/4P3/8/8/6K1 w - - 0 1',move:'e4d5',steps:["The pawn spots an unprotected target.","The pawn captures the enemy piece.","The enemy piece leaves the board."]},
 defense:{fen:'k7/8/8/8/8/8/4r3/4K3 w - - 0 1',move:'e1e2',steps:["The king is in check.","The attacking rook is unprotected.","The king captures the rook. No more check."]},
 doubleAttack:{fen:'1r5k/8/8/8/8/8/8/4Q1K1 w - - 0 1',move:'e1e5',steps:["The queen moves.","Check along one diagonal.","The rook is attacked along the other diagonal. Two threats!"]},
};
const glyphs={w:{k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'},b:{k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}};
const xy=(s:string)=>({x:(s.charCodeAt(0)-97)*20+10,y:(8-Number(s[1]))*20+10});
export default function TacticDemo({kind,expanded=false,resultFen}:{kind:TaskView['demo'];expanded?:boolean;resultFen?:string}){
 const [open,setOpen]=useState(expanded||!!resultFen&&!window.matchMedia('(max-width:767px), (max-width:960px) and (max-height:500px)').matches),[frame,setFrame]=useState(0),[run,setRun]=useState(0);
 useEffect(()=>{if(!open)return;setFrame(0);const timer=setInterval(()=>setFrame(f=>Math.min(3,f+1)),1100);return()=>clearInterval(timer);},[open,run,kind,resultFen]);
 const ex=tacticExamples[kind],b=new Chess(resultFen||ex.fen);
 if(!resultFen&&frame>0)applyUci(b,ex.move);
 const pieces=b.board().flat().filter(p=>p!==null),source=resultFen?pieces.find(p=>p.color!==b.turn()&&targets(b,p.square).some(s=>b.get(s)?.type==='k'))?.square:ex.move.slice(frame?2:0,frame?4:2);
 const attacked=source?targets(b,source as Square).filter(s=>b.get(s)&&b.get(s)?.color!==b.get(source as Square)?.color):[];
 const shown=resultFen?pieces:new Chess(ex.fen).board().flat().filter(p=>p!==null);
 const pinLines=frame>=2&&kind==='pin'?pins(b,'w'):[];
 const king=pieces.find(p=>p.type==='k'&&p.color===b.turn()),blocked=king&&b.isCheckmate()?Array.from({length:64},(_,i)=>String.fromCharCode(97+i%8)+(8-Math.floor(i/8))).filter(s=>{const a=xy(s),k=xy(king.square);return s!==king.square&&Math.abs(a.x-k.x)<=20&&Math.abs(a.y-k.y)<=20;}):[];
 return <section className={'tactic-demo '+(expanded?'demo-prominent':'')} aria-label="Animated example"><button className="demo-toggle" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?"Close the example":"Watch an example of this tactic"} <span aria-hidden="true">{open?'−':'▶'}</span></button>{open&&<><div className="demo-diagram"><svg viewBox="0 0 160 160" role="img" aria-label={resultFen?"Explanation of your current result":"A separate example, not the solution to this challenge"}>{Array.from({length:64},(_,i)=><rect key={i} x={i%8*20} y={Math.floor(i/8)*20} width="20" height="20" fill={(i%8+Math.floor(i/8))%2?'#799589':'#f4e6bc'}/>)}{frame>=2&&blocked.map(s=>{const p=xy(s);return <g key={s}><rect x={p.x-10} y={p.y-10} width="20" height="20" fill="#e8675588"/><text x={p.x} y={p.y+5} textAnchor="middle" fill="#9e291d" fontSize="17">×</text></g>;})}{shown.map(p=>{const moved=!resultFen&&p.square===ex.move.slice(0,2)&&frame>0;const captured=!resultFen&&p.square===ex.move.slice(2,4)&&frame>0;const pos=xy(moved?ex.move.slice(2,4):p.square);return <text className={p.type==='k'&&b.isCheckmate()&&frame===2?'demo-king-search':''} style={{transform:'translate('+pos.x+'px,'+pos.y+'px)',transition:'transform .65s ease, opacity .45s',opacity:captured?0:1}} key={p.square+p.type} x={0} y={7} textAnchor="middle" fontSize="23" fill={p.color==='w'?'#fff':'#132c36'} stroke={p.color==='w'?'#304a51':'#f8e6b6'} strokeWidth=".8">{glyphs[p.color][p.type]}</text>;})}{frame>=2&&source&&attacked.map(s=>{const a=xy(source),z=xy(s);return <g key={s}><path d={'M'+a.x+' '+a.y+' L'+z.x+' '+z.y} stroke="#eaac32" strokeWidth="2" strokeDasharray="3 2"/><circle cx={z.x} cy={z.y} r="9" stroke="#fbcc4c" strokeWidth="2" fill="none"/></g>;})}{pinLines.map(pin=>{const a=xy(pin.source),z=xy(pin.rear);return <path key={pin.front} d={'M'+a.x+' '+a.y+' L'+z.x+' '+z.y} stroke="#ce563c" strokeWidth="2" strokeDasharray="2 2"/>;})}</svg><p aria-live="polite">{resultFen?(frame<2?"Look at the resulting position.":b.isCheckmate()?"The king is in check. It has no safe move, block or capture.":"Look at how the attacks changed after your move."):ex.steps[Math.max(0,frame-1)]}</p></div><small>{resultFen?"Your result":"Example on another board"}</small><button className="demo-replay" onClick={()=>{setFrame(0);setRun(n=>n+1);}}>Watch the example again</button></>}</section>;
}
