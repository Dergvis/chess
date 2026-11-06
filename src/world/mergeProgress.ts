import {ensureAdaptive} from './challenges/adaptive';
import type { WorldSave } from './types';
import { syncGrowth } from './growth';
import { ensureLearning } from './challenges/model';

const union = <T,>(a: T[], b: T[]) => [...new Set([...a, ...b])];
/** Merge achievements monotonically; retain the account's selected hero and preferences. */
export function mergeProgress(account: WorldSave, guest: WorldSave): WorldSave {
  const a = structuredClone(account), b = structuredClone(guest);
  syncGrowth(a); syncGrowth(b); ensureLearning(a); ensureLearning(b);
  if (!a.player.selectedCharacter) a.player = b.player;
  a.settings ||= b.settings;
  a.worldProgress.completedChallenges = union(a.worldProgress.completedChallenges, b.worldProgress.completedChallenges);
  a.worldProgress.milestones = union(a.worldProgress.milestones, b.worldProgress.milestones);
  a.games = [...new Map([...b.games, ...a.games].map(g => [g.id, g])).values()];
  for (const id of Object.keys(b.characters!) as Array<keyof NonNullable<WorldSave['characters']>>) {
    const x=a.characters![id], y=b.characters![id];
    x.progress=Math.max(x.progress,y.progress);
    x.unlockedParts=union(x.unlockedParts,y.unlockedParts);
    x.equippedParts=union(x.equippedParts,y.equippedParts);
    for(const k of Object.keys(y.actions) as Array<keyof typeof y.actions>) x.actions[k]=Math.max(x.actions[k]||0,y.actions[k]||0);
  }
  for(const skill of Object.keys(b.learning!.paths)) {
    const x=a.learning!.paths[skill],y=b.learning!.paths[skill];
    x.chapter=Math.max(x.chapter,y.chapter);
    for(const k of ['completed','verified'] as const) x[k]=union(x[k],y[k]);
    for(const k of ['successes','mechanics','bossWins'] as const) x[k]=union(x[k],y[k]);
    if(b.learning!.skills[skill].samples>a.learning!.skills[skill].samples) a.learning!.skills[skill]=b.learning!.skills[skill];
    for(const k of ['points','practice','realGame','relevance'] as const) a.mastery[skill][k]=Math.max(a.mastery[skill][k],b.mastery[skill][k]);
  }
  a.learning!.attempts=[...new Map([...b.learning!.attempts,...a.learning!.attempts].map(t=>[t.id,t])).values()].sort((x,y)=>x.at-y.at).slice(-600);
  a.learning!.rewarded=union(a.learning!.rewarded,b.learning!.rewarded);
  a.learning!.checkpointOffered=union(a.learning!.checkpointOffered,b.learning!.checkpointOffered);
  a.learning!.experience ||= b.learning!.experience;
  a.learning!.calibrated ||= b.learning!.calibrated;
  a.learning!.unlockedRegions=union(a.learning!.unlockedRegions||[],b.learning!.unlockedRegions||[]);
  a.learning!.chapterOneSeen ||= b.learning!.chapterOneSeen;
  delete a.learning!.adaptive;
  ensureAdaptive(a.learning!);
  a.journey!.onboardingSeen ||= b.journey!.onboardingSeen;
  a.journey!.worldSeen ||= b.journey!.worldSeen;
  a.journey!.legacyOpen ||= b.journey!.legacyOpen;
  a.characterProgress.firstWinRewardClaimed ||= b.characterProgress.firstWinRewardClaimed;
  a.challengeResults={...b.challengeResults,...a.challengeResults};
  a.personalDemosCompleted=Math.max(a.personalDemosCompleted||0,b.personalDemosCompleted||0);
  a.miniGames ||= {};
  a.miniGames.guideSeen={...b.miniGames?.guideSeen,...a.miniGames.guideSeen};
  a.miniGames.polygon ||= {};
  for(const id of ['knight','mage','inventor'] as const){
    const y=b.miniGames?.polygon?.[id];if(!y)continue;
    const x=a.miniGames.polygon[id];if(!x){a.miniGames.polygon[id]=y;continue;}
    for(const k of ['bestScore','bestCombo','targetsHit','accuracy','highestWeaponLevel'] as const)x[k]=Math.max(x[k],y[k]);
    x.medals=union(x.medals,y.medals);
    x.runs=[...new Map([...y.runs,...x.runs].map(r=>[r.id,r])).values()];
    for(const tier of Object.keys(y.byWeapon))x.byWeapon[+tier]=Math.max(x.byWeapon[+tier]||0,y.byWeapon[+tier]);
    x.weaponBests ||= {};
    for(const tier of Object.keys(y.weaponBests||{})){const best=y.weaponBests![+tier];if(!x.weaponBests[+tier])x.weaponBests[+tier]=best;else for(const k of ['bestScore','bestTargetsHit','bestMultiHit','accuracy'] as const)x.weaponBests[+tier][k]=Math.max(x.weaponBests[+tier][k],best[k]);}
  }
  a.trainingSessions=[...new Map([...(b.trainingSessions||[]),...(a.trainingSessions||[])].map(r=>[r.id,r])).values()];
  for(const k of ['gamesPlayed','wins','puzzlesSolved','skillsMastered','arenaWins','forksFound'] as const) a.achievements![k]=Math.max(a.achievements![k],b.achievements![k]);
  a.achievements!.weeklyMeaningfulDays=union(a.achievements!.weeklyMeaningfulDays,b.achievements!.weeklyMeaningfulDays);
  a.updatedAt=Date.now();
  return syncGrowth(a);
}
