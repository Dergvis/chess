import {useEffect,useState} from 'react';
import {Chess} from 'chess.js';
import PieceGuide from '../PieceGuide';
import {ChessCore} from '../../entities/chess/ChessCore';
import GameScreen from '../../features/game/GameScreen';
import {getCharacter} from '../../entities/character/characters';
import {getPieceSkin} from '../../entities/piece-skins/pieceSkins';
import {getDifficultyPreset} from '../../shared/config/difficulty';
import {exercisePool,topics} from './catalog';
import {applyUci,targets} from '../engine';
import {taskPresentation} from './presentation';
import TacticDemo from './TacticDemo';
import './taskUX.css';
export default function TeachingExample({skill,onContinue}:{skill:string;onContinue:()=>void}){
 const [frame,setFrame]=useState(0);
 useEffect(()=>{const timer=setInterval(()=>setFrame(n=>Math.min(3,n+1)),1300);return()=>clearInterval(timer);},[]);
 const c=exercisePool.find(c=>c.skill===skill&&c.goal.kind==='move'&&c.reviewStatus!=='needing-review');
 if(!c)return <main className="activity-shell"><h1>Watch an example</h1><p>{topics.get(skill)?.description}</p><button onClick={onContinue}>My turn to try →</button></main>;
 const b=new Chess(c.fen),u=c.solutions[0];if(frame)applyUci(b,u);
 const source=frame?u.slice(2,4):u.slice(0,2),victims=frame>=2?targets(b,source as any).filter(s=>b.get(s)&&b.get(s)?.color!==c.player):[];
 const v=taskPresentation(c),title=skill==='mate'?"Learn to checkmate":skill==='fork'?"Learn to make a fork":skill==='pin'?"Learn to make a pin":"See how this tactic works";
 return <section className="original-puzzle teaching-example"><GameScreen gameState={new ChessCore(b.fen()).getState()} playerColor={c.player} opponent={getCharacter('bear')} pieceSkin={getPieceSkin('default')} difficulty={getDifficultyPreset('level_1')} selectedSquare={null} legalMoves={[]} onSelectSquare={()=>{}} onMakeMove={()=>{}} onResign={onContinue} isEngineTurn training={{source,targets:victims,move:frame===1?{from:u.slice(0,2),to:u.slice(2,4)}:undefined,header:<div className="training-task-header lesson-panel" data-task-type={skill==='mate'?'demo_mate':skill==='fork'?'demo_fork':'demo_'+skill}><span className="lesson-number">WATCH AN EXAMPLE</span><h1>{frame>=2&&b.isCheckmate()?"You did it! Checkmate":title}</h1><p>{frame>=2?v.success:topics.get(skill)?.description}</p><small>Watch the example, then try it yourself.</small><TacticDemo kind={v.demo} expanded/></div>,panel:<div className="lesson-panel"><button className="world-button" onClick={onContinue}>My turn to try →</button><PieceGuide initialOpen={false}/></div>}}/></section>;
}
