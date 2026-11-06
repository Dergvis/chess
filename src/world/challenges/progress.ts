import {topicMastery} from '../personalLearning';
import type { WorldSave } from "../types";
import type { Attempt, Exercise } from "./types";
import { ensureLearning, observe } from "./model";
import { awardAction, syncGrowth } from "../growth";
import { emit } from "../events";
export function recordAttempt(save: WorldSave, c: Exercise, a: Attempt) {
  const s = structuredClone(save),
    l = ensureLearning(s);
  if (!observe(l, a)) return s;
  const pathSkill = a.pathSkill || a.skill;
  if (
    (l.paths[pathSkill]?.completed.length || 0) >
    (save.learning?.paths[pathSkill]?.completed.length || 0)
  ) {
    emit("stage_completed", { skill: pathSkill, stage: a.chapter });
    if (a.chapter === 4) {
      emit("guardian_defeated", { skill: pathSkill });
      emit("world_location_unlocked", { after: pathSkill });
    }
  }
  const m = l.skills[c.skill];
  s.mastery[c.skill] ||= { points: 0, practice: 0, realGame: 0, relevance: 0 };
  if (
    a.correct &&
    !a.scaffolding &&
    c.type !== "PERSONAL_GAME" &&
    !l.rewarded.includes(c.id)
  ) {
    l.rewarded.push(c.id);
    if(a.mode!=="personal" && a.mode!=="mixed") awardAction(s, "puzzles");
    s.achievements!.puzzlesSolved++;
    // Content completion remains available for migration and history, not chapter thresholds.
    if (!s.worldProgress.completedChallenges.includes(c.id))
      s.worldProgress.completedChallenges.push(c.id);
  }
  s.mastery[c.skill].points = Math.max(
    s.mastery[c.skill].points,
    Math.round(
      m.execution * 0.4 + m.recognition * 0.4 + Math.min(100, m.realGame) * 0.2
    )
  );
  s.mastery[c.skill].practice = Math.max(
    s.mastery[c.skill].practice,
    Math.round(m.execution * 0.4 + m.recognition * 0.4)
  );
  if (
    l.paths[c.skill]?.completed.length === 4 &&
    !s.worldProgress.milestones.includes("mastery-path-" + c.skill)
  ) {
    s.worldProgress.milestones.push("mastery-path-" + c.skill);
    awardAction(s, "skills");
  }
  l.skills[a.skill].masteryScore=topicMastery(s,a.skill).score;
  emit("mastery_updated",{skill:a.skill,score:topicMastery(s,a.skill).score});
  if(!topicMastery(save,a.skill).weak&&topicMastery(s,a.skill).weak)emit("weak_topic_detected",{skill:a.skill});
  return syncGrowth(s);
}
