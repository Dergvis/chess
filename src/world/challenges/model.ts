import {ensureAdaptive,updateAdaptive} from './adaptive';
import type { WorldSave } from "../types";
import type { Attempt, LearningState, SkillMastery } from "./types";
import { skills, forSkill } from "../catalog";
export const stageNames = [
  "Learn",
  "Spot the tactic",
  "Use it",
  "Guardian battle",
];
export const stagePlaces = ["Gates", "Tower", "Courtyard", "Guardian"];
export const blankSkill = (): SkillMastery => ({
  execution: 0,
  recognition: 0,
  calculationDepth: 1,
  hintDependency: 0,
  errorRate: 0,
  realGame: 0,
  difficulty: 1,
  samples: 0,
  recent: [],
});
export function ensureLearning(s: WorldSave): LearningState {
  s.learning ||= {
    version: 1,
    calibrated: false,
    calibrationIndex: 0,
    globalSkillScore: 20,
    recognitionScore: 0,
    calculationDepth: 1,
    hintDependency: 0,
    errorRate: 0,
    skills: {},
    paths: {},
    attempts: [],
    rewarded: [],
    checkpointOffered: [],
  };
  const l = s.learning;
  if (!s.journey)
    s.journey = {
      version: 2,
      legacyOpen: !!(
        l.calibrated ||
        l.attempts.length ||
        s.games.length ||
        s.worldProgress.completedChallenges.length
      ),
    };
  l.journeyVersion = 2;
  for (const skill of skills) {
    s.mastery[skill] ||= { points: 0, practice: 0, realGame: 0, relevance: 0 };
    l.skills[skill] ||= blankSkill();
    if (!l.paths[skill]) {
      const old = forSkill(skill),
        done = old.filter((c) =>
          s.worldProgress.completedChallenges.includes(c.id)
        ).length;
      const completed = old.length ? Math.floor((done / old.length) * 4) : 0;
      l.paths[skill] = {
        chapter: Math.min(4, completed + 1),
        completed: Array.from({ length: completed }, (_, i) => i + 1),
        verified: [],
        successes: [],
        mechanics: [],
        bossWins: [],
      };
      l.skills[skill].execution = Math.min(70, s.mastery[skill]?.points || 0);
    }
  }
  ensureAdaptive(l);
  return l;
}
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function observe(l: LearningState, a: Attempt) {
  if (l.attempts.some((x) => x.id === a.id)) return false;
  ensureAdaptive(l);
  const m = (l.skills[a.skill] ||= blankSkill());
  l.attempts.push(a);
  l.attempts = l.attempts.slice(-600);
  if (a.scaffolding) return true;
  const independent = a.correct && a.attempts === 1 && a.hintLevel === 0;
  const evidence = a.correct
    ? Math.max(
        15,
        (100 - (a.attempts - 1) * 18 - a.hintLevel * 22) *
          (0.5 + 0.5 * a.quality)
      )
    : 0;
  // Named exercises cannot provide recognition evidence. Hinted successes are weaker evidence.
  if (a.hidden) m.recognition = clamp(m.recognition * 0.76 + evidence * 0.24);
  else m.execution = clamp(m.execution * 0.76 + evidence * 0.24);
  m.samples++;
  m.hintDependency = m.hintDependency * 0.8 + (a.hintLevel / 3) * 0.2;
  m.errorRate =
    m.errorRate * 0.8 +
    (a.correct ? Math.min(1, (a.attempts - 1) / 3) : 1) * 0.2;
  if (a.correct && a.hintLevel === 0)
    m.calculationDepth = Math.max(m.calculationDepth, Math.min(6, a.depth));
  updateAdaptive(l,a);
  const all = Object.values(l.skills),
    seen = all.filter((x) => x.samples > 0);
  if (seen.length) {
    l.recognitionScore =
      seen.reduce((n, x) => n + x.recognition, 0) / seen.length;
    l.hintDependency =
      seen.reduce((n, x) => n + x.hintDependency, 0) / seen.length;
    l.errorRate = seen.reduce((n, x) => n + x.errorRate, 0) / seen.length;
    l.calculationDepth = Math.max(...seen.map((x) => x.calculationDepth));
  }
  if (a.mode !== "path" || a.scaffolding) return true;
  const p = l.paths[a.pathSkill || a.skill];
  if (!p || a.chapter !== p.chapter || p.completed.includes(p.chapter))
    return true;
  if (a.correct && !p.successes.includes(a.challengeId)) {
    p.successes.push(a.challengeId);
    if (!p.mechanics.includes(a.type)) p.mechanics.push(a.type);
  }
  if (
    (l.journeyVersion === 2 &&
      p.chapter < 4 &&
      a.correct &&
      p.successes.length >= 3) ||
    (a.type === "BOSS" && (l.journeyVersion === 2 ? a.correct : independent))
  ) {
    if (!p.bossWins.includes(a.challengeId)) p.bossWins.push(a.challengeId);
    p.completed.push(p.chapter);
    p.chapter = Math.min(4, p.chapter + 1);
    p.successes = [];
    p.mechanics = [];
  }
  return true;
}
export function bossReady(l: LearningState, skill: string) {
  const p = l.paths[skill],
    m = l.skills[skill];
  if (!p || !m) return false;
  const recent = l.attempts
    .filter(
      (a) =>
        a.mode === "path" &&
        (a.pathSkill || a.skill) === skill &&
        a.chapter === p.chapter
    )
    .slice(-3);
  return (
    p.successes.length >= 3 &&
    p.mechanics.length >= 2 &&
    recent.length >= 2 &&
    recent.slice(-2).every((a) => a.correct && a.hintLevel < 2) &&
    (p.chapter < 3 ||
      skill !== "fork" ||
      p.mechanics.some((x) =>
        ["MULTI_STEP", "MINI_GAME", "DEFEND"].includes(x)
      ))
  );
}
export function checkpointEligible(l: LearningState, skill: string) {
  return (
    l.paths[skill].chapter === 1 &&
    !l.checkpointOffered.includes(skill) &&
    (l.globalSkillScore >= 48 || l.experience === "confident")
  );
}
export function acceptCheckpoint(l: LearningState, skill: string) {
  const results = l.attempts
    .filter((a) => a.mode === "checkpoint" && a.skill === skill)
    .slice(-2);
  if (
    results.length !== 2 ||
    !results.every(
      (a) =>
        a.correct && a.attempts === 1 && !a.hintLevel && a.elapsedMs < 120000
    )
  )
    return false;
  const p = l.paths[skill];
  if (!p.completed.includes(1)) p.completed.push(1);
  if (!p.verified.includes(1)) p.verified.push(1);
  p.chapter = Math.max(2, p.chapter);
  return true;
}
