import type {WorldSave} from './types';
import {exercisePool} from './challenges/catalog';
import {ensureLearning} from './challenges/model';
import {ensureAdaptive} from './challenges/adaptive';
export function worldRegions(save:WorldSave){
 const l=ensureLearning(save),a=ensureAdaptive(l),completed=Object.keys(l.paths).filter(k=>l.paths[k].completed.length>=4);
 const content=exercisePool.filter(c=>c.id.startsWith('advanced-')&&c.reviewStatus==='ready'&&completed.includes(c.skill));
 const masters=completed.filter(k=>(a.topics[k]?.score||0)>=55&&(a.topics[k]?.samples||0)>=3);
 return [{id:'tactical-pass',name:"Tactics Pass",x:19,y:19,open:(l.unlockedRegions?.includes('tactical-pass')||completed.length>=3)&&content.length>=12,description:"New positions from familiar topics",pool:content.map(c=>c.id)},
 {id:'mastery-heights',name:"Mastery Heights",x:68,y:13,open:(l.unlockedRegions?.includes('mastery-heights')||(completed.length===5&&masters.length>=3))&&content.filter(c=>c.goal.kind!=='move').length>=6,description:"Calculate a continuation several moves ahead",pool:content.filter(c=>c.goal.kind!=='move').map(c=>c.id)},
 {id:'unknown-east',name:'???',x:85,y:16,open:false,description:"The path is hidden in mist",pool:[] as string[]}];
}
