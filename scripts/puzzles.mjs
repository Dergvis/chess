// Builds the public puzzle collection from the production challenge catalogue.
// Every position and answer comes from src/world/challenges/prepared.json and is
// replayed with chess.js, so the site never shows a puzzle the game would reject.
import prepared from '../src/world/challenges/prepared.json' with {type:'json'};
import {Chess} from 'chess.js';
import {puzzleExamples} from './content.mjs';

const pieceName={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const side=c=>c==='w'?'White':'Black';

export const puzzleThemes=[
  {skill:'mate',anchor:'checkmate',title:'Checkmate in one move',short:'Checkmate',
   intro:'Checkmate means the king is attacked and has no legal way out. In each position, find the one move that gives checkmate.',
   task:()=> 'Find checkmate in one move.',
   hint:m=>`Use the ${pieceName[m.piece]} on ${m.from}. Before you move, check every square the king could escape to.`},
  {skill:'fork',anchor:'fork',title:'Fork puzzles',short:'Fork',
   intro:'A fork is one piece attacking two or more enemy pieces at the same time. Knights are famous for it, but every piece can fork.',
   task:()=> 'Find a fork: one move that attacks two pieces at once.',
   hint:m=>`Move the ${pieceName[m.piece]} on ${m.from}. Look for a square that touches two targets.`},
  {skill:'pin',anchor:'pin',title:'Pin puzzles',short:'Pin',
   intro:'A pin holds an enemy piece in place because a more valuable piece, often the king, stands behind it on the same line.',
   task:()=> 'Find the move that pins an enemy piece to its king.',
   hint:m=>`Use the ${pieceName[m.piece]} on ${m.from}. Line up your piece, the enemy piece and the enemy king.`},
  {skill:'doubleAttack',anchor:'double-attack',title:'Double attack puzzles',short:'Double Attack',
   intro:'A double attack creates two threats with one move. Your opponent can usually answer only one of them.',
   task:()=> 'Make two threats with one move.',
   hint:m=>`Move the ${pieceName[m.piece]} on ${m.from}. Find a square where it threatens two things at once.`},
  {skill:'defense',anchor:'defense',title:'Defense puzzles',short:'Defense',
   intro:'Good players look at the opponent’s threats first. Escape, capture the attacker or protect the piece that is in danger.',
   task:(m,inCheck)=> inCheck?'Your king is in check. Find the move that makes it safe.':'One of your pieces is under attack. Find the move that removes the threat.',
   hint:m=>m.captured?`Look at the ${pieceName[m.piece]} on ${m.from}. Can it capture the attacker?`:m.piece==='k'?`Your king on ${m.from} has to move. Which square is not attacked?`:`Look at the ${pieceName[m.piece]} on ${m.from}. Where is it safe?`}
];

const handwritten=new Map(puzzleExamples.map(p=>[p.id,p]));

function build(entry,theme){
  const chess=new Chess(entry.fen),inCheck=chess.inCheck(),solution=entry.solutions[0];
  const move=chess.move({from:solution.slice(0,2),to:solution.slice(2,4),promotion:solution[4]||'q'});
  if(!move)throw Error('Invalid production puzzle '+entry.id);
  if(theme.skill==='mate'&&!chess.isCheckmate())throw Error('Mate puzzle without mate '+entry.id);
  const mover=side(move.color),piece=pieceName[move.piece];
  const why=entry.explanation.replace(/^The piece on/,`The ${piece} on`);
  const own=handwritten.get(entry.id);
  return {id:entry.id,theme:theme.anchor,themeTitle:theme.short,fen:entry.fen,solution,source:move.from,san:move.san,
    turn:move.color,level:entry.difficulty,
    task:own?.tryIt??`${mover} to move. ${theme.task(move,inCheck)}`,
    hint:own?.hint??theme.hint(move,inCheck),
    answer:own?.answer??`${move.captured?`${mover}’s ${piece} on ${move.from} takes the ${pieceName[move.captured]} on ${move.to}`:`${mover}’s ${piece} moves from ${move.from} to ${move.to}`} (${move.san}). ${why}`};
}

// Single-move positions only: those are the ones a child can solve with two taps.
export const puzzleSets=puzzleThemes.map(theme=>{
  const items=prepared.filter(e=>e.skill===theme.skill&&!e.hidden&&e.type!=='MULTI_STEP'&&e.solutions.length===1&&e.goal?.kind==='move');
  const puzzles=items.map(e=>build(e,theme)).sort((a,b)=>a.level-b.level||(handwritten.has(b.id)-handwritten.has(a.id)));
  return {...theme,puzzles};
});
export const puzzleCount=puzzleSets.reduce((n,s)=>n+s.puzzles.length,0);
