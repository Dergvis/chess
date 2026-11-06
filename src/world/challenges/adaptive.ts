import type {Attempt,Exercise,LearningState} from './types';
import {emit} from '../events';
export const adaptiveConfig={version:1,seed:{new:1,some:2,confident:4},maxTier:5,window:5,raiseAfter:3,lowerAfter:3,fastMs:25000,mixedMix:[.6,.2,.2],masteryUnlock:55,masterySamples:3};
export interface TopicEstimate {tier:number;score:number;samples:number;used:string[];recent:Attempt[];masterUnlocked?:boolean;}
export interface AdaptiveState {version:1;globalSkillEstimate:number;topics:Record<string,TopicEstimate>;arenaGames:string[];}
const clamp=(n:number,min=1,max=5)=>Math.max(min,Math.min(max,n));
export function contentTier(c:Exercise){
 if(c.difficultyTier)return c.difficultyTier;
 if(c.goal.kind==='targets')return 1;
 if(c.goal.kind!=='move')return c.goal.minMoves>=3?5:4;
 if(c.objective&&['discovered','exploitPin','unpin','defendMate','defendPin','defendDouble'].includes(c.objective.kind))return 4;
 return clamp(c.difficulty,1,3);
}
export function contentMetadata(c:Exercise):Exercise {return {...c,difficultyTier:contentTier(c),solutionDepth:c.goal.kind==='move'?1:c.goal.kind==='targets'?0:c.goal.minMoves,recognitionRequired:!!c.hidden,mixedTheme:c.type==='MIXED'};}
function fresh(tier:number):TopicEstimate{return {tier,score:0,samples:0,used:[],recent:[]};}
export function ensureAdaptive(l:LearningState):AdaptiveState {
 if(l.adaptive?.version===1){for(const k of Object.keys(l.skills))l.adaptive.topics[k]||=fresh(adaptiveConfig.seed[l.experience||'new']);return l.adaptive;}
 const seed=adaptiveConfig.seed[l.experience||'new'];
 l.adaptive={version:1,globalSkillEstimate:seed,topics:Object.fromEntries(Object.keys(l.skills).map(k=>[k,fresh(seed)])),arenaGames:[]};
 // Reconstruct evidence, never story completion, from the preserved attempt history.
 for(const a of l.attempts)if(!a.scaffolding)updateAdaptive(l,a,false);
 return l.adaptive;
}
export function seedExperience(l:LearningState,id:NonNullable<LearningState['experience']>){l.experience=id;const a=ensureAdaptive(l),seed=adaptiveConfig.seed[id];if(!l.attempts.some(x=>!x.scaffolding)){a.globalSkillEstimate=seed;for(const k of Object.keys(l.skills)){a.topics[k]=fresh(seed);l.skills[k].difficulty=seed;}l.globalSkillScore=seed*20;}}
export function updateAdaptive(l:LearningState,a:Attempt,events=true){
 const state=l.adaptive||ensureAdaptive(l),m=state.topics[a.skill]||=fresh(state.globalSkillEstimate);
 if(a.scaffolding||m.recent.some(x=>x.id===a.id))return;
 const tier=a.difficultyTier||clamp(a.depth>1?4:a.difficulty,1,3),before=m.tier,globalBefore=state.globalSkillEstimate;
 m.recent=[...m.recent,a].slice(-adaptiveConfig.window);m.samples++;
 const independent=a.correct&&a.attempts===1&&!a.hintLevel&&!(a.errors?.length||0);
 const quality=a.correct?Math.max(0,1-(a.attempts-1)*.18-a.hintLevel*.2):0;
 const evidence=quality*(35+tier*13)+(independent&&a.hidden?5:0);
 m.score=Math.round(clamp(m.samples===1?evidence:m.score*.72+evidence*.28,0,100));
 const unused=m.recent.filter(x=>!m.used.includes(x.id));
 const fast=(x:Attempt)=>x.correct&&x.attempts===1&&!x.hintLevel&&!(x.errors?.length||0)&&x.elapsedMs<=adaptiveConfig.fastMs*Math.max(1,x.solutionDepth||x.depth)&&((x.difficultyTier||Math.min(3,x.difficulty))>=m.tier-1);
 if(unused.length>=adaptiveConfig.raiseAfter&&unused.slice(-adaptiveConfig.raiseAfter).every(fast)){m.tier=clamp(m.tier+1);m.used=m.recent.map(x=>x.id);}
 else if(unused.length>=adaptiveConfig.lowerAfter&&unused.slice(-adaptiveConfig.window).filter(x=>!x.correct||x.attempts>=3||x.hintLevel>=2).length>=adaptiveConfig.lowerAfter){m.tier=clamp(m.tier-1);m.used=m.recent.map(x=>x.id);}
 if(l.skills[a.skill])l.skills[a.skill].difficulty=m.tier;
 if(independent)state.globalSkillEstimate=clamp(state.globalSkillEstimate*.94+(tier+(a.hidden ? .5 : 0))*.06);
 else if(!a.correct)state.globalSkillEstimate=clamp(state.globalSkillEstimate-.04);
 l.globalSkillScore=Math.round(state.globalSkillEstimate*20);
 if(events){emit('topic_mastery_updated',{skill:a.skill,score:m.score,tier:m.tier,samples:m.samples});if(before!==m.tier){emit(m.tier>before?'difficulty_increased':'difficulty_decreased',{skill:a.skill,from:before,to:m.tier});if(a.mode==='mixed')emit('misty_difficulty_changed',{skill:a.skill,from:before,to:m.tier});}if(Math.abs(globalBefore-state.globalSkillEstimate)>.001)emit('global_skill_updated',{source:'puzzles',estimate:state.globalSkillEstimate});}
 if(!m.masterUnlocked&&m.samples>=adaptiveConfig.masterySamples&&m.score>=adaptiveConfig.masteryUnlock){m.masterUnlocked=true;if(events)emit('mastery_challenge_unlocked',{skill:a.skill});}
}
export function assignedTier(l:LearningState,skill:string){const a=ensureAdaptive(l),m=a.topics[skill]||fresh(a.globalSkillEstimate);return clamp(Math.round(m.samples>=3?m.tier:Math.max(m.tier,a.globalSkillEstimate-1)));}
export function observeArena(l:LearningState,game:{id:string;result:string;level:number;moves:unknown[];reason?:string},score?:number){const a=ensureAdaptive(l);if(a.arenaGames.includes(game.id)||game.moves.length<12||game.result==='quit'||game.reason==='in-progress')return;a.arenaGames.push(game.id);a.arenaGames=a.arenaGames.slice(-100);const before=a.globalSkillEstimate;const evidence=game.result==='win'?Math.min(5,game.level+.5):score!==undefined?clamp(score/20):before;a.globalSkillEstimate=clamp(before+clamp((evidence-before)*.15,-.25,.4));l.globalSkillScore=Math.round(a.globalSkillEstimate*20);emit('global_skill_updated',{source:'arena',game:game.id,from:before,estimate:a.globalSkillEstimate});}
