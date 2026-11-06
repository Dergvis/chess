import type {HeroId} from '../types';
import type {RangeRun} from './model';
import {energyRules,heroProgression} from '../heroConfig';
export type AimPoint={x:number;y:number};
export interface EnergyTarget extends AimPoint {id:number;homeX:number;homeY:number;phase:number;kind:'shield'|'crystal'|'tower';hitAt?:number;}
export const arcadeConfig={chainScores:[100,250,500],beamScores:[40,100,160],impactSeconds:.65,respawnSeconds:.9,anticipationSeconds:.24,hitRadius:32,lensBonus:12};
export class EnergyRound {
 time=0;charge=0;held:number|null=null;score=0;shots=0;hitShots=0;targetsHit=0;bestMultiHit=0;combo=0;bestCombo=0;cooldown=0;flash:EnergyTarget[]=[];wave=0;targets:EnergyTarget[]=[];aim:AimPoint={x:65,y:40};width=1000;height=600;feedback='';gain=0;shotAt=-10;shotCharge=0;firing=false;
 private serial=0;private pending:{point:AimPoint;id?:number;charge:number;at:number}|null=null;private replacements:number[]=[];
 constructor(public hero:HeroId,public tier:number,private random=Math.random){this.spawn();}
 private target(index:number):EnergyTarget {const phase=this.random()*Math.PI*2;const homeX=45+(index%3)*16+(this.random()-.5)*8,homeY=23+Math.floor(index/3)*31+(this.random()-.5)*10;return {id:++this.serial,x:homeX,y:homeY,homeX,homeY,phase,kind:(['shield','crystal','tower'] as const)[index%3]};}
 spawn(){this.wave++;this.targets=Array.from({length:this.tier===1?3:5},(_,i)=>this.target(i));}
 setViewport(width:number,height:number){this.width=width;this.height=height;}
 setAim(point:AimPoint){this.aim={x:Math.max(0,Math.min(100,point.x)),y:Math.max(0,Math.min(100,point.y))};}
 hold(point:AimPoint|number){if(this.cooldown||this.pending||this.time>=heroProgression.roundSeconds)return;if(typeof point==='number'){const t=this.targets.find(t=>t.id===point);if(t)this.setAim(t);}else this.setAim(point);this.held=1;this.charge=0;}
 cancel(){this.held=null;this.charge=0;}
 chain(id:number){const first=this.targets.find(t=>t.id===id&&t.hitAt===undefined);if(!first)return [];const chain=[first],rules=energyRules(this.hero,this.tier);while(chain.length<rules.chainCount){const last=chain[chain.length-1],next=this.targets.filter(t=>t.hitAt===undefined&&!chain.includes(t)).sort((a,b)=>Math.hypot(a.x-last.x,a.y-last.y)-Math.hypot(b.x-last.x,b.y-last.y))[0];if(!next||Math.hypot(next.x-last.x,next.y-last.y)>rules.reach)break;chain.push(next);}return chain;}
 fire(id:number){const t=this.targets.find(t=>t.id===id&&t.hitAt===undefined);if(!t)return;if(this.hero==='mage')this.queue(t,id);else this.release(this.aim);}
 release(point=this.aim){if(this.held===null)return;this.setAim(point);this.queue(this.aim);}
 private queue(point:AimPoint,id?:number){if(this.cooldown||this.pending||this.time>=heroProgression.roundSeconds)return;this.shots++;this.pending={point:{...point},id,charge:this.charge,at:this.time+(this.hero==='mage'?arcadeConfig.anticipationSeconds:.08)};this.held=null;this.cooldown=1;this.charge=0;}
 private resolve(){const p=this.pending!;this.pending=null;this.shotCharge=p.charge;this.aim=p.point;let hits:EnergyTarget[]=[];
  if(this.hero==='mage')hits=this.chain(p.id!);else{const radius=arcadeConfig.hitRadius+(this.tier>=2?arcadeConfig.lensBonus:0);const nearby=this.targets.filter(t=>t.hitAt===undefined).sort((a,b)=>this.distance(a,p.point)-this.distance(b,p.point));if(nearby[0]&&this.distance(nearby[0],p.point)<=radius){hits=[nearby[0]];if(this.tier>=5&&p.charge>=.5){const second=nearby.slice(1).find(t=>this.distance(t,nearby[0])<Math.max(110,this.width*.25));if(second)hits.push(second);}}}
  this.shotAt=this.time;this.flash=hits.map(t=>({...t}));this.firing=true;this.gain=0;
  if(hits.length){this.hitShots++;this.targetsHit+=hits.length;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.bestMultiHit=Math.max(this.bestMultiHit,hits.length);const strength=p.charge<.35?0:p.charge<.8?1:2;this.gain=this.hero==='mage'?arcadeConfig.chainScores[Math.min(2,hits.length-1)]:arcadeConfig.beamScores[strength]*hits.length*(this.tier>=4?1.5:1);this.score+=this.gain;hits.forEach(t=>t.hitAt=this.time);this.replacements.push(...hits.map(()=>this.time+arcadeConfig.respawnSeconds));this.feedback=this.hero==='mage'&&hits.length>1?"Chain x"+hits.length+'!':this.combo>1?"Streak x"+this.combo+'!':"Hit!";}else{this.combo=0;this.feedback="Miss!";}this.cooldown=this.hero==='mage'?.85:.45;
 }
 private distance(a:AimPoint,b:AimPoint){return Math.hypot((a.x-b.x)*this.width/100,(a.y-b.y)*this.height/100);}
 step(dt:number){if(this.time>=heroProgression.roundSeconds)return;dt=Math.max(0,dt);this.time=Math.min(heroProgression.roundSeconds,this.time+dt);this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.held!==null)this.charge=Math.min(1,this.charge+dt*(this.tier>=3?1.15:.72));
  for(const t of this.targets){if(t.hitAt!==undefined)continue;const speed=.65+this.tier*.08,phase=this.time*speed+t.phase;t.x=Math.max(39,Math.min(91,t.homeX+Math.sin(phase)*9));t.y=Math.max(14,Math.min(83,t.homeY+Math.cos(phase*(this.tier>=3?1.35:.8))*7));}
  if(this.pending&&this.time>=this.pending.at)this.resolve();
  this.targets=this.targets.filter(t=>t.hitAt===undefined||this.time-t.hitAt<arcadeConfig.impactSeconds);
  const due=this.replacements.filter(at=>at<=this.time).length;this.replacements=this.replacements.filter(at=>at>this.time);if(due){this.wave++;for(let i=0;i<due;i++)this.targets.push(this.target((this.serial+i)%5));}
  if(this.time-this.shotAt>.62)this.firing=false;if(this.time-this.shotAt>1.2){this.flash=[];this.feedback='';}
 }
 get charging(){return this.held!==null||this.pending!==null;}
 result(id:string,completed:boolean):RangeRun{return {id,hero:this.hero,weaponLevel:this.tier,score:this.score,bestCombo:this.bestCombo,targetsHit:this.targetsHit,shots:this.shots,hitShots:this.hitShots,accuracy:this.shots?Math.round(this.hitShots/this.shots*100):0,duration:completed?heroProgression.roundSeconds:Math.floor(this.time),finishedAt:Date.now(),completed,bestMultiHit:this.bestMultiHit};}
}
