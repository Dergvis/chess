import {Chess, type Square} from 'chess.js';
import {track,recordVisit} from './analytics';
import exercise from './quick-challenge.json';
recordVisit();track(location.pathname==='/'?'homepage_view':'landing_view');
document.querySelectorAll<HTMLAnchorElement>('a[href="/play/"]').forEach(a=>a.addEventListener('click',()=>track('play_click')));

const boardElement=document.querySelector<HTMLDivElement>('#quick-board');
if(boardElement){
 const board=new Chess(exercise.fen);let selected:Square|null=null,solved=false,started=false;
 const status=document.querySelector<HTMLElement>('#challenge-status')!;
 const names:Record<string,string>={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
 function draw(){boardElement!.replaceChildren();for(let rank=8;rank>0;rank--)for(let f=0;f<8;f++){
  const square=('abcdefgh'[f]+rank) as Square,piece=board.get(square),button=document.createElement('button');button.type='button';button.className='square '+((rank+f)%2?'light':'dark')+(selected===square?' selected':'');button.dataset.square=square;button.disabled=solved;button.setAttribute('aria-label',`${square}${piece?', '+(piece.color==='w'?'White ':'Black ')+names[piece.type]:', empty'}`);button.setAttribute('aria-pressed',String(selected===square));
  if(piece){const img=document.createElement('img');img.src=`/assets/pieces/${piece.color}-${piece.type}.png`;img.alt='';img.width=80;img.height=80;img.draggable=false;button.append(img);}
  if(f===0||rank===1){const label=document.createElement('small');label.textContent=(f===0?rank:'')+''+(rank===1?'abcdefgh'[f]:'');button.append(label);}
  button.onclick=()=>{if(!started){track('puzzle_start');started=true;}if(piece?.color==='w'){selected=square;status.textContent=`${names[piece.type]} selected. Choose a destination.`;draw();return;}if(!selected){status.textContent='Choose a white piece first.';return;}const move=selected+square;try{const result=board.move({from:selected,to:square,promotion:'q'});if(!result)throw Error('illegal');if((exercise.solutions as string[]).includes(move)){solved=true;status.textContent='Great move! ★ Your knight checks the king and attacks the rook. You earned a star.';document.querySelector('#challenge-reward')?.removeAttribute('hidden');track('puzzle_complete');}else{board.undo();status.textContent='A legal move. Try finding a square where the knight attacks both the king and the rook.';}}catch{status.textContent='That move is not legal. Try another square.';}selected=null;draw();};boardElement!.append(button);
 }}draw();document.querySelector<HTMLButtonElement>('#challenge-reset')!.onclick=()=>{board.load(exercise.fen);selected=null;solved=false;started=false;status.textContent='White to move. Can your knight attack the king and rook at once?';document.querySelector('#challenge-reward')?.setAttribute('hidden','');draw();};
}

// Small progressive enhancement for the static, server-rendered game examples.
document.querySelectorAll<HTMLElement>('.example-card[data-fen]').forEach(card=>{
 const position=new Chess(card.dataset.fen),solution=card.dataset.solution;
 const status=card.querySelector<HTMLElement>('.example-feedback');
 const squares=Array.from(card.querySelectorAll<HTMLButtonElement>('.example-square'));
 let selected:Square|null=null,solved=false,started=false;
 squares.forEach(square=>square.addEventListener('click',()=>{
  if(solved)return;
  if(!started){track('puzzle_start');started=true;}
  const target=square.dataset.square as Square,piece=position.get(target);
  if(!selected){if(piece?.color!==position.turn()){status!.textContent='Select one of your pieces first.';return;}selected=target;square.setAttribute('aria-pressed','true');status!.textContent=`${piece.type.toUpperCase()} selected. Choose a destination.`;return;}
  const from=selected;selected=null;
  squares.forEach(item=>item.setAttribute('aria-pressed','false'));
  let move;try{move=position.move({from,to:target,promotion:'q'});}catch{/* An illegal move remains on the initial board. */}
  if(!move){status!.textContent='That move is not legal. Try another square.';return;}
  if(from+target!==solution){position.undo();status!.textContent='A legal move, but look for the move that solves this challenge.';return;}
  solved=true;status!.textContent=`Correct: ${move.san}. Open the solution below to see why it works.`;
  const source=card.querySelector<HTMLButtonElement>(`[data-square="${from}"]`),image=source?.querySelector('img');
  if(image)square.replaceChildren(image);
  track('puzzle_complete');
 }));
});

if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistration('/').then(r=>r?.update()).catch(()=>{});
