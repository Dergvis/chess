import {Chess, type Square} from 'chess.js';
import {applyUci, targets} from '../engine';
import type {Exercise, TaskType} from './types';

const instrument:Record<string,string>={n:"with the knight",p:"with the pawn",b:"with the bishop",r:"with the rook",q:"with the queen",k:"with the king"};
export const pieceName:Record<string,string>={n:"knight",p:"pawn",b:"bishop",r:"rook",q:"queen",k:"king"};
export function classifyTask(c:Exercise):TaskType {
 if(c.taskType)return c.taskType;
 const b=new Chess(c.fen);
 if(c.goal.kind==='targets')return c.skill==='mate'?'recognize_mate':c.skill==='pin'?'find_pin':'recognize_targets';
 if(c.goal.kind==='promotion')return 'promote_pawn';
 if(c.goal.kind==='survive')return 'hold_position';
 if(c.goal.kind==='material')return c.goal.requireFork?'fork_then_capture':c.goal.requireObjective?.kind==='pin'?'use_pin':'win_piece';
 if(c.goal.kind==='mate')return c.goal.maxMoves===1?'mate_in_one':'finish_mating_attack';
 if(c.type==='DEFEND'||c.tags.includes('prevent-fork'))return b.inCheck()?'escape_check':'defend_piece';
 if(c.objective?.kind==='capture'||c.tags.includes('free-capture'))return 'win_piece';
 if(c.objective&&['unpin','defendMate','defendPin','defendDouble'].includes(c.objective.kind))return b.inCheck()?'escape_check':'defend_piece';
 if(c.skill==='mate')return 'mate_in_one';
 if(c.skill==='fork')return c.chapter===2?'find_fork':'fork_in_one';
 if(c.skill==='pin')return c.objective?.kind==='exploitPin'?'use_pin':'find_pin';
 if(c.skill==='doubleAttack')return 'double_attack';
 return b.inCheck()?'escape_check':'defend_piece';
}
export function decorateExercise(c:Exercise):Exercise {
 const taskType=classifyTask(c),b=new Chess(c.fen);
 const enemyKing=b.board().flat().find(p=>p?.type==='k'&&p.color!==b.turn());
 let reason=c.reviewReason;
 if(enemyKing&&b.isAttacked(enemyKing.square,b.turn()))reason="The opponent’s king is already in check, but the attacking side is marked to move.";
 if(c.goal.kind!=='targets'&&b.isGameOver())reason="A finished position cannot require another move.";
 if(c.goal.kind==='move'&&!c.solutions.length)reason="No verified answer is available.";
 if(taskType==='mate_in_one'&&c.solutions.some(u=>{try{const n=new Chess(c.fen);applyUci(n,u);return !n.isCheckmate();}catch{return true;}}))reason="The saved answer does not give checkmate in one move.";
 return {...c,taskType,reviewStatus:reason?'needing-review':'ready',reviewReason:reason};
}
export interface TaskView {taskType:TaskType;title:string;instruction:string;success:string;hints:string[];highlights:string[];source?:string;step?:string;demo:'mate'|'fork'|'pin'|'capture'|'defense'|'doubleAttack';recognition:boolean;terminal:boolean;}
export function taskPresentation(c:Exercise,fen=c.fen,ownMoves=0,solved=false,progress?:{forkCreated:boolean}):TaskView {
 const b=new Chess(fen),initial=new Chess(c.fen),taskType=classifyTask(c),recognition=c.goal.kind==='targets',terminal=b.isCheckmate();
 const source=c.goal.kind==='targets'?c.goal.source:c.source||c.solutions[0]?.slice(0,2);
 const piece=source?initial.get(source as Square)?.type:undefined;
 const specific=c.chapter===1||c.type==='CHOOSE_SQUARE';
 const fork=taskType.includes('fork'),mate=taskType.includes('mate')||taskType==='finish_mating_attack',pin=taskType.includes('pin');
 const view:TaskView={taskType,title:"Protect a piece",instruction:"Stop your opponent winning your piece on the next move.",success:"You did it! The threat is stopped.",hints:["Find the piece under attack.","You can move away, defend it or capture the attacker.","Check what your opponent can capture after your move."],highlights:[],demo:mate?'mate':fork?'fork':pin?'pin':taskType==='double_attack'?'doubleAttack':taskType==='win_piece'?'capture':'defense',recognition,terminal};
 if(mate){view.title=recognition?"Is this checkmate yet?":taskType==='mate_in_one'?"Checkmate in 1 move":"Finish the attack";view.instruction=recognition?"Check: can the king escape, block the attack or capture the attacker?":"Find a check that leaves no escape, block or capture.";view.success="Checkmate! The king cannot escape, block or capture the attacker.";view.hints=["Look at where the king can move.","Which squares do your pieces already cover?","Find a check that leaves no way to escape."];if(!recognition&&!c.hidden){const king=initial.board().flat().find(p=>p?.type==='k'&&p.color!==c.player);if(king)view.highlights=[king.square];view.instruction+=" Do not let the highlighted king escape.";}}
 if(mate&&recognition)view.hints=["Is the king in check now?","Can it move to a safe square?","Can the check be blocked or the attacker captured?"];
 if(fork||taskType==='double_attack'){view.title=fork?(specific&&piece?"Make a fork "+instrument[piece]:"Find a move that creates a fork"):"Make two threats in one move";view.instruction="Find a move that lets one of your pieces attack two targets at once.";view.success="You did it! One piece attacks several targets at once.";view.hints=["Find two enemy pieces near each other.","Which of your pieces can attack both at once?",piece?"Try "+instrument[piece]+'.':"Look for checks and attacks."];if(!c.hidden&&specific&&c.solutions[0]){try{const n=new Chess(c.fen),m=applyUci(n,c.solutions[0]);view.highlights=targets(n,m.to).filter(s=>n.get(s)?.color!==c.player&&!!n.get(s));if(view.highlights.length>=2)view.instruction="Find a move that lets one piece attack the highlighted targets.";else view.highlights=[];}catch{/* Audit excludes invalid positions. */}}}
 if(pin){view.title=recognition?"Find the pinned piece":taskType==='use_pin'?"Use the pin":"Make a pin";view.instruction=recognition?"Mark the piece in front of the king that the highlighted piece attacks.":"Line up with an enemy piece and its king. The first piece cannot move away and expose its king to check.";view.success=recognition?"Correct! This piece shields the king.":taskType==='use_pin'?"You did it! The pin helped your attack.":"You did it! The piece is pinned to its king and cannot expose it to check.";view.hints=["Find the piece shielding the king.","Look at the line between that piece and its king.",piece?"Try "+instrument[piece]+'.':"Check the lines of the rook, bishop and queen."];}
 if(pin&&!recognition&&c.objective?.kind==='exploitPin'){view.title="Use the pin";view.instruction="Find a useful continuation: a pinned piece cannot defend freely.";}
 if(pin&&!recognition&&c.tags.includes('relative-pin')){view.instruction="Pin a piece to a more valuable piece behind it.";}
 if(recognition&&!mate){view.source=source;view.highlights=[];if(!pin){view.title="Find the pieces under attack";view.instruction="Mark all the pieces attacked by "+(piece?pieceName[piece]:"piece")+" on "+source+". You do not need to move a piece.";view.success="Correct! You found every target of the highlighted piece.";}view.hints=["Start with the highlighted piece on "+source+'.',"Trace its attacks. Other pieces can block the path.","Mark only enemy pieces that its attack can reach."];}
 if(taskType==='win_piece'){view.title="Win a piece";view.instruction="Find a useful capture. Check that the reply will not cost you more.";view.success="You did it! You won material.";}
 if(taskType==='promote_pawn'){view.title="Promote a pawn";view.instruction="Take your pawn to the last rank and choose a new piece.";view.success="You did it! The pawn promoted.";}
 if(taskType==='hold_position'){view.title="Keep your pieces safe";view.instruction="Stop the threats and do not leave your pieces unprotected.";view.success="You did it! You held the position.";}
 if(!recognition&&b.inCheck()&&b.turn()===c.player&&!solved){view.title=mate?"Escape check and give checkmate":fork?"Escape check and make a fork":"Save your king from check";view.instruction="Your king is already in check. "+(mate?"Find a move that protects it and checkmates the other king.":fork?"Find a safe move that also creates a double attack.":"Move away, block the attack or capture the attacker.");view.highlights=[];}
 if(c.goal.kind!=='move'&&!recognition){const max='maxMoves'in c.goal?c.goal.maxMoves:1;view.step=b.turn()!==c.player?"Opponent’s reply · after your move "+ownMoves:(ownMoves+1===max?"Last move":('minMoves'in c.goal&&c.goal.minMoves===max?"Your move "+(ownMoves+1)+" of "+max:"Your move "+(ownMoves+1)+" · up to "+max+" moves"));if(c.goal.kind==='material'&&c.goal.requireFork){view.success="Great! You won material with a fork.";if(ownMoves===0&&c.id==='fork-prepare-sacrifice'){view.title="Prepare a fork";view.instruction="First draw the king away so the knight can create a double threat.";}else if(ownMoves>0&&b.turn()!==c.player){view.title="Your opponent answers the threat";view.instruction="See which piece is saved and which remains under attack.";}else if(ownMoves>0&&!b.inCheck()&&progress&&!progress.forkCreated){view.title="Make a fork";view.instruction="Now find a move that attacks two enemy pieces at once.";}else if(ownMoves>0&&!b.inCheck()){const captures=b.moves({verbose:true}).filter(m=>m.captured);view.title=captures.length?"Capture the piece under attack":"Keep your advantage";view.instruction=captures.length?"Find a useful capture after the reply. Check your piece’s protection.":"Do not give your gain back. Move your piece to a safe square.";}}}
 // Mixed positions retain the recognition challenge until the result is known.
 if(c.type==='MIXED'&&!solved){view.title="Find the best move";view.instruction=b.inCheck()?"Your king is in check. Find the strongest escape.":"Compare checks, captures and threats. Choose a move that improves your position.";view.highlights=[];view.demo='capture';}
 if(solved&&terminal){view.title="Checkmate!";view.success="The king cannot escape, block or capture the attacker.";view.demo='mate';}
 return view;
}
