import type {HeroId} from './types';
export const heroProgression={thresholds:[8,24,45,70],roundSeconds:60};
export const heroConfig:Record<HeroId,{attackOrigin:'cannon'|'eyes'|'scepter';trainingGameType:'cannon'|'beam'|'chain';upgrades:string[];instruction:string;effects:string[]}>={
 knight:{attackOrigin:'cannon',trainingGameType:'cannon',upgrades:["Basic cannon","Optical sight","Boosted charge","Stabiliser","Super shot"],instruction:"Aim and hit the target.",effects:["Precision shot","The sight helps you aim the cannon","Powerful charge","Steady aim","Powerful blast"]},
 inventor:{attackOrigin:'eyes',trainingGameType:'beam',upgrades:["Laser gaze","Focusing lenses","Energy core","Beam amplifier","Double beam"],instruction:"Hold to charge. Aim and release to fire.",effects:["One eye beam","Easier to catch the charge","Strong pulse","The beam reaches a nearby target","Two eye beams"]},
 mage:{attackOrigin:'scepter',trainingGameType:'chain',upgrades:["Sceptre","Lightning crystal","Conductors","Storm sceptre","Chain lightning"],instruction:"Tap the first target. Lightning jumps to nearby targets.",effects:["One target","Bright spark and two targets","Energy reaches farther","A chain of three targets","Long-range chain lightning"]}
};
export const energyRules=(hero:HeroId,tier:number)=>({chainCount:hero==='mage'?(tier===1?1:tier<4?2:3):(tier<4?1:2),reach:hero==='mage'?20+tier*4:35,chargeLow:tier===1?.55:.35,chargeHigh:.9,beamWidth:tier===2?3:4+tier});
