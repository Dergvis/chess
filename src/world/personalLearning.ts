import {assignedTier,contentTier,ensureAdaptive} from './challenges/adaptive';
import type {WorldSave} from './types';
import {accessConfig} from './access';
import {exercisePool} from './challenges/catalog';
import {skills} from './catalog';

export function topicMastery(save:WorldSave,skill:string) {
  const rows=(save.learning?.attempts||[]).filter(a=>a.skill===skill&&!a.scaffolding).slice(-accessConfig.masteryWindow);
  let weight=0,sum=0;
  for(const attempt of rows) {
    const evidence=attempt.hidden?1.5:1;
    const errors=Math.max(attempt.attempts-1,attempt.errors?.length||0);
    const timePenalty=Math.max(0,attempt.elapsedMs-90000)/15000;
    const score=attempt.correct?Math.max(0,100-errors*18-attempt.hintLevel*20-timePenalty):0;
    sum+=evidence*Math.min(100,score+(attempt.correct?(attempt.difficulty-1)*2:0));
    weight+=evidence;
  }
  const estimate=save.learning?ensureAdaptive(save.learning).topics[skill]:undefined;
  const score=estimate?.samples?estimate.score:weight?Math.round(sum/weight):0;
  const difficulties=rows.filter(a=>!a.correct||a.attempts>1||(a.errors?.length||0)>0||a.hintLevel>0).length;
  const weak=rows.length>=accessConfig.minMasterySamples&&score<60&&difficulties>=3;
  const label=rows.length<accessConfig.minMasterySamples?"In progress":weak?"Worth practising":score>=85?"Going very well":"Getting there";
  return {score,samples:rows.length,weak,label};
}
export function weakTopics(save:WorldSave) {
  return skills.filter(k=>topicMastery(save,k).weak).sort((a,b)=>topicMastery(save,a).score-topicMastery(save,b).score);
}
export function learnedTopics(save:WorldSave) {
  return skills.filter(k=>(save.learning?.paths[k]?.completed.length||0)>=4);
}

/** The fortress training hall and Polygon share this selection policy. */
export function trainingPool(save:WorldSave,topic?:string,mixed=false,rng=Math.random,ids?:string[]) {
  const rows=save.learning?.attempts||[];
  const allowed=topic?[topic]:mixed?learnedTopics(save):skills.filter(k=>rows.some(a=>a.skill===k&&!a.scaffolding)||learnedTopics(save).includes(k));
  if(!allowed.length)return [];
  const weak=allowed.filter(k=>topicMastery(save,k).weak);
  const medium=allowed.filter(k=>!weak.includes(k)&&topicMastery(save,k).score<85);
  const strong=allowed.filter(k=>topicMastery(save,k).score>=85);
  const result:typeof exercisePool=[];
  for(let index=0;index<accessConfig.trainingSize;index++) {
    const roll=rng();
    const bucket=roll<accessConfig.trainingMix[0]?weak:roll<accessConfig.trainingMix[0]+accessConfig.trainingMix[1]?medium:strong;
    const choices=bucket.length?bucket:allowed;
    let choice=choices[Math.min(choices.length-1,Math.floor(rng()*choices.length))];
    if(mixed&&allowed.length>1&&(result[result.length-1]?.skill||rows[rows.length-1]?.skill)===choice) {
      choice=allowed.filter(k=>k!==choice).sort((a,b)=>result.filter(c=>c.skill===a).length-result.filter(c=>c.skill===b).length)[0];
    }
    const valid=(c:typeof exercisePool[number])=>(!ids||ids.includes(c.id))&&c.reviewStatus!=='needing-review'&&c.type!=='BOSS'&&!c.scaffolding&&(!mixed||c.goal.kind!=='targets')&&!result.some(x=>x.family===c.family);
    let candidates=exercisePool.filter(c=>c.skill===choice&&valid(c));
    if(!candidates.length&&!topic)candidates=exercisePool.filter(c=>allowed.includes(c.skill)&&valid(c));
    const recent=rows.slice(-3);
    const rank=(c:typeof exercisePool[number])=>{
      const seen=rows.filter(x=>x.family===c.family);
      const struggling=topicMastery(save,c.skill).weak;
      const base=save.learning?assignedTier(save.learning,c.skill):1;
      const difficulty=Math.max(1,Math.min(5,base+(mixed?(roll<.6?0:roll<.8?-1:1):0)));
      void struggling;
      const relatedDifficulty=rows.slice(-10).some(x=>(!x.correct||x.attempts>1)&&(x.family===c.family||(x.subskill&&x.subskill===c.subskill)));
      return (seen.length?100:0)+(recent.some(x=>x.family===c.family)?1000:0)-(relatedDifficulty?20:0)+Math.abs(contentTier(c)-difficulty)*2000+(seen[seen.length-1]?.at||0)/1e13;
    };
    candidates.sort((a,b)=>rank(a)-rank(b));
    if(candidates[0])result.push({...candidates[0],hidden:mixed,recognitionRequired:mixed,mixedTheme:mixed,pathSkill:undefined,type:mixed?'MIXED':candidates[0].type,prompt:mixed?"Find the best move.":candidates[0].prompt});
  }
  return result;
}
