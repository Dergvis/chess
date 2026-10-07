import type { Exercise, LearningState } from "./types";
import { exercisePool } from "./catalog";
import {assignedTier,contentTier} from "./adaptive";
import {emit} from "../events";
import { bossReady } from "./model";
export function selectExercise(
  l: LearningState,
  skill: string,
  mode: "path" | "mixed" | "checkpoint" = "path",
  rng = Math.random
): Exercise {
  const adaptiveTarget=assignedTier(l,skill);
  const m = l.skills[skill],
    p = l.paths[skill],
    chapter = p?.chapter || 1;
  const lastAttempts = l.attempts.filter((a) => a.skill === skill).slice(-3);
  // A short exercise on attack lines addresses the missing prerequisite before
  // returning to the tactical task. It does not unlock a chapter or award power.
  if (
    mode === "path" &&
    lastAttempts.length >= 2 &&
    lastAttempts
      .slice(-2)
      .every(
        (a) =>
          !a.scaffolding && (!a.correct || a.hintLevel >= 2 || a.attempts >= 3)
      )
  ) {
    const support = exercisePool.filter(c=>c.reviewStatus!=='needing-review').filter(
      (c) => c.skill === skill && c.goal.kind === "targets"
    );
    const c =
      support.find(
        (c) => !l.attempts.slice(-12).some((a) => a.family === c.family)
      ) || support[0];
    if (c)
      return {
        ...c,
        chapter,
        pathSkill: skill,
        scaffolding: true,
        hidden: false,
        subskill: "board-vision",
        prompt:
          "Trace the attacks first. Mark the pieces the highlighted piece can reach.",
      };
  }
  const learned = Object.keys(l.skills).filter(
    (k) =>
      l.skills[k].execution > 0 ||
      l.skills[k].recognition > 0 ||
      l.skills[k].realGame > 0
  );
  if (mode === "mixed" && !learned.length)
    throw Error("Mixed practice needs a previously learned topic");
  let candidates = exercisePool.filter(
    (c) => c.skill === skill && c.type !== "BOSS" && c.reviewStatus!=="needing-review"
  );
  if (mode === "mixed")
    candidates = exercisePool.filter(
      (c) =>
        learned.includes(c.skill) &&
        ["MOVE", "CHOOSE_MOVE", "DEFEND"].includes(c.type)
    );
  else if (mode === "checkpoint")
    candidates = exercisePool.filter(
      (c) =>
        c.skill === skill &&
        c.goal.kind === "move" &&
        c.type !== "BOSS" &&
        c.difficulty >= 2
    );
  else if (
    (l.journeyVersion === 2 ? chapter === 4 : bossReady(l, skill)) ||
    p?.completed.length === 4
  )
    candidates = exercisePool.filter(
      (c) => c.skill === skill && c.reviewStatus!=="needing-review" && (adaptiveTarget>=4?c.goal.kind!=="targets":c.type === "BOSS" && c.chapter === chapter)
    );
  else {
    const desired =
      chapter === 1
        ? ["CHOOSE_SQUARE", "CHOOSE_MOVE", "FIND_TARGET", "MOVE"]
        : chapter === 2
        ? ["FIND_THREAT", "MOVE", "CHOOSE_MOVE"]
        : chapter === 3
        ? ["DEFEND", "MULTI_STEP", "MINI_GAME"]
        : ["MINI_GAME", "MOVE", "CHOOSE_MOVE", "FIND_THREAT", "MULTI_STEP"];
    const staged = candidates.filter((c) => desired.includes(c.type));
    if (staged.length && adaptiveTarget<4) candidates = staged;
    if (chapter === 4 && learned.length > 1 && rng() < 0.55)
      candidates = exercisePool.filter(
        (c) =>
          learned.includes(c.skill) &&
          c.goal.kind === "move" &&
          c.type !== "BOSS"
      );
  }
  if (!candidates.length) throw Error("No exercises registered for " + skill);
  const recent = l.attempts.slice(-12),
    last = recent[recent.length - 1];
  candidates=candidates.filter(c=>c.reviewStatus!=="needing-review");
  const closest=Math.min(...candidates.map(c=>Math.abs(contentTier(c)-adaptiveTarget)));
  candidates=candidates.filter(c=>Math.abs(contentTier(c)-adaptiveTarget)===closest);
  const unseen = candidates.filter(
    (c) => !recent.some((a) => a.family === c.family)
  );
  if (unseen.length) candidates = unseen;
  const scored = candidates
    .map((c) => ({
      c,
      score:
        Math.abs(contentTier(c) - adaptiveTarget) * 20 +
        (last?.type === c.type ? 4 : 0) +
        (p?.mechanics.includes(c.type) ? 1 : 0) +
        (m?.hintDependency > 0.5 && c.type === "CHOOSE_MOVE" ? -1 : 0) +
        (l.recentGameNeeds?.includes(c.skill) &&
        ["DEFEND", "MULTI_STEP", "MINI_GAME"].includes(c.type)
          ? -2
          : 0) +
        rng() * 0.6,
    }))
    .sort((a, b) => a.score - b.score);
  let c = { ...scored[0].c };
  if(mode==="path"&&chapter===4)c={...c,type:"BOSS"};
  if (
    mode === "mixed" ||
    (mode === "path" &&
      chapter >= 2 &&
      c.type !== "BOSS" &&
      c.goal.kind === "move" &&
      (c.skill !== skill || m.execution > m.recognition + 15))
  )
    c = { ...c, type: "MIXED" };
  const hidden = c.type === "MIXED" || mode === "mixed";
  emit("difficulty_assigned",{skill:c.skill,target:adaptiveTarget,actual:contentTier(c),exercise:c.id,mode});
  return {
    ...c,
    chapter,
    pathSkill: mode === "path" ? skill : undefined,
    hidden, recognitionRequired:hidden, mixedTheme:mode==="mixed",
    prompt: hidden
      ? c.goal.kind === "material"
        ? "Gain an advantage and keep it until the challenge ends."
        : c.goal.kind === "promotion"
        ? "Take the pawn to the last rank."
        : c.goal.kind === "survive"
        ? "Withstand the attack and keep your pieces safe."
        : c.goal.kind === "mate"
        ? `Finish the attack in ${c.goal.maxMoves} moves.`
        : c.goal.kind === "targets"
        ? "Mark every piece attacked by the highlighted piece."
        : "Find a strong continuation."
      : c.prompt,
  };
}
