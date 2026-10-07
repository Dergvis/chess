import {
  mistyUnlocked,
  nextLocation,
  locationUnlocked,
  MISTY_TOPICS_REQUIRED,
} from "../journey";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  exercisePool,
  personalExercise,
  registerTopic,
  calibrationExercise,
} from "./catalog";
import { newWorld, selectCharacter } from "../progress";
import { ensureLearning, observe, bossReady, acceptCheckpoint } from "./model";
import { selectExercise } from "./selector";
import { recordAttempt } from "./progress";
import { fortressState } from "../growth";
import { trainingAnswers } from "../trainingRules";
import { applyUci, targets, detectSkills, values } from "../engine";
import type { Attempt, Exercise } from "./types";
const memory = new Map();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => memory.get(k) || null,
    setItem: (k: string, v: string) => memory.set(k, v),
  },
  fetch: async () => ({ ok: true }),
});
const fresh = () => {
  const s = selectCharacter(newWorld(), "inventor");
  ensureLearning(s);
  return s;
};
function attempt(c: Exercise, overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: crypto.randomUUID(),
    challengeId: c.id,
    family: c.family,
    skill: c.skill,
    type: c.type,
    chapter: c.chapter,
    correct: true,
    attempts: 1,
    elapsedMs: 12000,
    hintLevel: 0,
    hidden: !!c.hidden,
    difficulty: c.difficulty,
    depth: 1,
    moves: c.solutions.slice(0, 1),
    errors: [],
    quality: 1,
    at: Date.now(),
    mode: "path",
    ...overrides,
  };
}
const ids = new Set();
for (const c of exercisePool) {
  assert(!ids.has(c.id), c.id);
  ids.add(c.id);
  const b = new Chess(c.fen),
    legal = b
      .moves({ verbose: true })
      .map((m) => m.from + m.to + (m.promotion || ""));
  assert(
    b
      .board()
      .flat()
      .filter((p) => p?.type === "k").length === 2,
    c.id
  );
  const opponentKing = b
    .board()
    .flat()
    .find((p) => p?.type === "k" && p.color !== b.turn())!;
  assert(
    !b.isAttacked(opponentKing.square, b.turn()),
    "nonmoving king in check: " + c.id
  );
  c.solutions.forEach((m) => assert(legal.includes(m), c.id + " " + m));
  if (c.goal.kind === "move") assert(c.solutions.length, c.id);
  if (c.goal.kind === "targets")
    assert.deepEqual(
      [...c.goal.squares].sort(),
      targets(b, c.goal.source as any)
        .filter(
          (s) =>
            b.get(s) &&
            b.get(s)?.color !==
              b.get(c.goal.kind === "targets" ? (c.goal.source as any) : "a1")
                ?.color
        )
        .sort()
    );
  if (c.tags.includes("prevent-fork")) {
    for (const m of c.solutions) {
      const n = new Chess(c.fen);
      applyUci(n, m);
      assert.equal(
        trainingAnswers({ fen: n.fen(), skill: "fork", objective: "safeFork" })
          .length,
        0,
        c.id + " " + m
      );
    }
  }
  if (c.line) {
    const n = new Chess(c.fen);
    let fork = false;
    for (const m of c.line) {
      const before = n.fen();
      applyUci(n, m);
      if (detectSkills(before, n.fen(), m.slice(2, 4)).includes("fork"))
        fork = true;
    }
    if (c.goal.kind === "material") {
      const material = (b: Chess) =>
        b
          .board()
          .flat()
          .reduce(
            (v, p) =>
              v +
              (p && p.type !== "k"
                ? (p.color === c.player ? 1 : -1) * values[p.type]
                : 0),
            0
          );
      assert(material(n) - material(b) >= c.goal.gain, c.id);
      if(c.goal.requireFork)assert(fork, c.id);
      if(c.goal.requireFork)assert(n.turn() === c.player, c.id);
    }
  }
}
assert(exercisePool.filter((c) => c.skill === "fork").length >= 30);
assert(
  new Set(exercisePool.filter((c) => c.skill === "fork").map((c) => c.type))
    .size >= 9
);
console.log(
  "PASS prepared pool: legal turns, all accepted answers, threat geometry, defenses and engine continuations",
  exercisePool.length
);
let s = fresh(),
  l = ensureLearning(s);
const c = exercisePool.find((c) => c.skill === "fork" && c.type === "MOVE")!;
for (let i = 0; i < 4; i++)
  observe(l, attempt(c, { challengeId: "fast-" + i }));
assert.equal(l.skills.fork.difficulty, 2);
observe(l, attempt(c));
assert.equal(
  l.skills.fork.difficulty,
  2,
  "No repeated difficulty increase from the same streak"
);
for (let i = 0; i < 3; i++) observe(l, attempt(c, { correct: false }));
assert.equal(l.skills.fork.difficulty, 1);
assert.equal(l.skills.fork.recognition, 0, "Named practice is not recognition");
observe(l, attempt(c, { hidden: true, type: "MIXED" }));
assert(l.skills.fork.recognition > 0);
const picked = selectExercise(l, "fork", "mixed", () => 0.2);
assert(picked.hidden);
assert.equal(picked.type, "MIXED");
assert(!/вилк|мат|связк|защит/i.test(picked.prompt));
console.log(
  "PASS adaptation, streak consumption, execution versus recognition and hidden mixed prompts"
);
s = fresh();
for (const c of exercisePool
  .filter((c) => c.skill === "fork" && c.type !== "BOSS")
  .slice(0, 4))
  s = recordAttempt(s, { ...c, chapter: 1 }, attempt(c, { chapter: 1 }));
assert.equal(ensureLearning(s).paths.fork.chapter, 2);
assert.notEqual(selectExercise(ensureLearning(s), "fork").type, "BOSS");
assert.equal(
  fortressState(s, "fork"),
  2,
  "Three distinct successes complete the learning stage"
);
const boss = exercisePool.find((c) => c.id === "fork-boss-1")!;
const a = attempt(boss, { hidden: true, depth: 3 });
s = recordAttempt(s, boss, a);
assert.equal(fortressState(s, "fork"), 2);
const points = s.characters!.inventor.progress;
s = recordAttempt(s, boss, a);
assert.equal(s.characters!.inventor.progress, points);
assert.equal(fortressState(s, "fork"), 2);
s = fresh();
l = ensureLearning(s);
observe(l, attempt(c, { mode: "checkpoint", hidden: true }));
observe(l, attempt(c, { mode: "checkpoint", hidden: true }));
assert(acceptCheckpoint(l, "fork"));
assert(l.paths.fork.verified.includes(1));
assert.equal(l.paths.fork.chapter, 2);
console.log(
  "PASS sequential stage completion, no early guardian, idempotent rewards and preserved optional checkpoint"
);
s = fresh();
l = ensureLearning(s);
for (let i = 0; i < 7; i++) {
  l.calibrationIndex = i;
  const c = calibrationExercise(l);
  new Chess(c.fen);
  observe(l, attempt(c, { mode: "calibration" }));
}
assert.equal(new Set(l.attempts.map((a) => a.family)).size, 7);
assert.equal(
  personalExercise({
    id: "fake",
    analysis: {
      review: { fen: c.fen, solutions: c.solutions, skill: "fork", ply: 0 },
    },
    moves: [],
  } as any),
  null
);
console.log(
  "PASS seven calibration positions and rejection of fabricated personal games"
);
for (const skill of ["fork", "mate", "defense", "pin", "doubleAttack"]) {
  let save = fresh(),
    state = ensureLearning(save);
  state.calibrated = true;
  for (
    let count = 0;
    state.paths[skill].completed.length < 4 && count < 100;
    count++
  ) {
    const c = selectExercise(state, skill, "path", () => 0.75);
    save = recordAttempt(
      save,
      c,
      attempt(c, {
        pathSkill: skill,
        depth: c.goal.kind === "material" ? 3 : 1,
      })
    );
    state = ensureLearning(save);
  }
  assert.equal(
    state.paths[skill].completed.length,
    4,
    "All four chapters reachable: " + skill
  );
  assert.equal(fortressState(save, skill), 8);
}
console.log(
  "PASS all four chapters reachable for every registered launch topic"
);
registerTopic(
  { id: "test-topic", name: "Test", description: "Fixture" },
  Array.from({ length: 500 }, (_, i) => ({
    ...c,
    id: "test-" + i,
    family: "test-" + i,
    skill: "test-topic",
  }))
);
assert(exercisePool.length > 500);
assert(ensureLearning(fresh()).paths["test-topic"]);
console.log("PASS extensible topic registration and 500-exercise pack");

// New journey unlocks never overwrite migrated accomplishments.
{
  const save = fresh();
  const state = ensureLearning(save);
  state.experience = "new";
  assert.equal(nextLocation(save), "mate");
  assert(locationUnlocked(save, "fork"));
  assert(locationUnlocked(save, "pin"));
  assert(!locationUnlocked(save, "doubleAttack"));
  assert(!mistyUnlocked(save));
  for (const topic of ["mate", "fork"])
    state.paths[topic].completed = [1, 2, 3, 4];
  assert(!mistyUnlocked(save));
  state.paths.pin.completed = [1, 2, 3, 4];
  assert(mistyUnlocked(save));
  assert.equal(MISTY_TOPICS_REQUIRED, 3);
  const legacy = structuredClone(save);
  delete legacy.journey;
  legacy.learning!.calibrated = true;
  const old = JSON.stringify(legacy.learning!.paths);
  ensureLearning(legacy);
  assert.equal(JSON.stringify(legacy.learning!.paths), old);
  assert(!locationUnlocked(legacy, "defense"));
  assert.equal(nextLocation(legacy), "doubleAttack");
  const retry = fresh();
  const lp = ensureLearning(retry).paths.fork;
  lp.completed = [1, 2, 3];
  lp.chapter = 4;
  const guardian = exercisePool.find(
    (c) => c.skill === "fork" && c.type === "BOSS" && c.chapter === 4
  )!;
  const won = recordAttempt(
    retry,
    guardian,
    attempt(guardian, { attempts: 3, hintLevel: 0 })
  );
  assert.equal(
    ensureLearning(won).paths.fork.completed.length,
    4,
    "A corrected mistake does not reset the guardian"
  );
  console.log(
    "PASS experience recommendation, three-topic mist gate, legacy preservation and guardian retry"
  );
}
