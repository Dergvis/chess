import advanced from './advanced.json';
import {contentMetadata} from './adaptive';
import {decorateExercise} from './presentation';
import prepared from "./prepared.json";
import { Chess } from "chess.js";
import { territories, skills } from "../catalog";
import type { Exercise, LearningState } from "./types";
import type { GameRecord } from "../types";
import { isGameReview } from "../gameRecord";
export const exercisePool: Exercise[] = [...(prepared as Exercise[]),...(advanced as Exercise[])].map(decorateExercise).map(contentMetadata);
export const topics = new Map(
  territories
    .filter((t) => t.id !== "arena")
    .map((t) => [t.id, { id: t.id, name: t.short, description: t.lesson }])
);
export function registerTopic(
  topic: { id: string; name: string; description: string },
  content: Exercise[]
) {
  if (topics.has(topic.id)) throw Error("Topic already registered");
  if (content.some((c) => c.skill !== topic.id)) throw Error("Topic mismatch");
  const ids = new Set(exercisePool.map((c) => c.id));
  for (const c of content) {
    if (ids.has(c.id)) throw Error("Duplicate exercise");
    new Chess(c.fen);
    ids.add(c.id);
  }
  topics.set(topic.id, topic);
  skills.push(topic.id);
  exercisePool.push(...content.map(decorateExercise));
  territories.push({
    id: topic.id,
    name: topic.name,
    short: topic.name,
    lesson: topic.description,
    x: 500,
    y: 400,
    color: "#a6b77d",
  });
}
export function personalExercise(game: GameRecord): Exercise | null {
  const r = game.analysis?.review;
  if (!r || !isGameReview(game, r)) return null;
  return {
    id: `personal-${game.id}-${r.ply}`,
    family: `personal-${game.id}-${r.ply}`,
    skill: r.skill,
    type: "PERSONAL_GAME",
    difficulty: 2,
    chapter: 2,
    fen: r.fen,
    player: new Chess(r.fen).turn(),
    solutions: r.solutions,
    prompt: `This happened in your game. Move ${
      Math.floor(r.ply / 2) + 1
    }. Find a strong continuation.`,
    explanation: r.explanation,
    goal: { kind: "move" },
    hidden: true,
    tags: [r.motif || r.skill],
    gameId: game.id,
    ply: r.ply,
  };
}
export function calibrationExercise(l: LearningState): Exercise {
  const index = l.calibrationIndex;
  if (index === 0)
    return {
      id: "hero-capture",
      family: "hero-capture",
      skill: "defense",
      type: "MOVE",
      difficulty: 1,
      chapter: 1,
      fen: "k7/3r4/8/8/8/8/8/3R2K1 w - - 0 1",
      player: "w",
      solutions: ["d1d7"],
      prompt: "Capture an unprotected enemy piece.",
      explanation: "The rook captured an unprotected rook.",
      goal: { kind: "move" },
      tags: ["free-capture"],
    };
  const plan = ["defense", "mate", "fork", "defense", "fork", "doubleAttack"];
  const skill = plan[index - 1] || "fork",
    difficulty =
      index < 4
        ? 1
        : Math.max(2, Math.min(4, Math.round(l.globalSkillScore / 22)));
  const list = exercisePool.filter(
    (c) => c.reviewStatus!=="needing-review" && c.skill === skill && c.goal.kind === "move" && c.type !== "BOSS"
  );
  const sorted = list.sort(
    (a, b) =>
      Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty)
  );
  const used = new Set(
    l.attempts.filter((a) => a.mode === "calibration").map((a) => a.family)
  );
  const c = sorted.find((c) => !used.has(c.family)) || sorted[0];
  return {
    ...c,
    type: index >= 5 ? "MIXED" : "MOVE",
    hidden: index >= 3,
    prompt:
      index === 1
        ? "Find a way out of this tricky position."
        : index === 2
        ? "Find checkmate in one move."
        : "Find a strong move.",
  };
}
