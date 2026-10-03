import {gateDurability} from './siege';
import {syncGrowth,partThresholds} from './growth';
import { trainingAnswers, canonicalBoard } from "./trainingRules";
import { worldKey } from "./accountStorage";
import { travelProgress } from "./movement";
import { archiveGame, isGameReview } from "./gameRecord";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { ChessCore } from "../entities/chess/ChessCore";
import { challenges, forSkill } from "./catalog";
import {
  analyzeGame,
  applyUci,
  botConfig,
  chooseBotMove,
  detectSkills,
  search,
  targets,
} from "./engine";
import {
  newWorld,
  completeChallenge,
  saveGame,
  applyAnalysis,
  completeReview,
  persistWorld,
  loadWorld,
  territoryStage,
  castleDamage,
  selectCharacter,
} from "./progress";
import type { GameRecord, Analysis } from "./types";
const storage = new Map();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, v),
  },
  fetch: async () => ({ ok: true }),
});
let count = 0;
function test(name: string, fn: () => void) {
  fn();
  count++;
  console.log("PASS", name);
}
test("Every challenge starts in a valid chess position and all accepted answers are legal", () => {
  for (const c of challenges) {
    const board = new Chess(c.fen),
      enemy = board.turn() === "w" ? "b" : "w",
      king = board
        .board()
        .flat()
        .find((p) => p?.type === "k" && p.color === enemy)!;
    assert(
      !board.isAttacked(king.square, board.turn()),
      c.id + " opponent king already in check"
    );
    for (const solution of c.solutions) {
      const b = new Chess(c.fen),
        m = applyUci(b, solution);
      assert(m, c.id + " " + solution);
      const skills = detectSkills(c.fen, b.fen(), m.to);
      if (c.skill === "mate") assert(b.isCheckmate(), c.id + " must be mate");
      if (c.skill === "pin") assert(skills.includes("pin"), c.id + " must pin");
      if (
        (c.skill === "fork" && c.kind !== "defend") ||
        c.skill === "doubleAttack"
      )
        assert(
          skills.includes("fork"),
          c.id + " must attack two valuable targets"
        );
      if (c.skill === "defense" || c.kind === "defend")
        assert(
          !b.isAttacked(
            b
              .board()
              .flat()
              .find((p) => p?.type === "k" && p.color === board.turn())!.square,
            enemy
          ),
          c.id + " king safe"
        );
    }
  }
});
test("Fork territory changes at four milestones, repeated rewards are idempotent", () => {
  let s = newWorld();
  const stage = [0];
  for (const c of forSkill("fork")) {
    s = completeChallenge(s, c);
    stage.push(castleDamage(s));
  }
  assert.deepEqual(stage, [0, 0, 0, 0, 2, 2, 2, 2, 4, 4, 4, 4, 6, 6, 6, 6, 8]);
  const repeated = completeChallenge(s, challenges[0]);
  assert.deepEqual(s, repeated);
  assert(s.worldProgress.milestones.includes("territory-fork"));
  persistWorld(s);
  assert.deepEqual(loadWorld(), s);
});
test("Rules preserve castling, en passant, underpromotion, checkmate and repetition", () => {
  const c = new ChessCore();
  for (const m of ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "e1g1"])
    assert(c.makeMove({ from: m.slice(0, 2), to: m.slice(2) }));
  assert(c.getHistory()[6].isCastling);
  assert.equal(c.getPieceAt("f1")?.type, "r");
  const ep = new ChessCore("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
  assert(ep.makeMove({ from: "e5", to: "d6" })?.isEnPassant);
  const promotion = new ChessCore("7k/P7/8/8/8/8/8/7K w - - 0 1");
  assert.equal(
    promotion.makeMove({ from: "a7", to: "a8", promotion: "n" })?.promotion,
    "n"
  );
  const mate = new ChessCore();
  for (const m of ["f2f3", "e7e5", "g2g4", "d8h4"])
    mate.makeMove({ from: m.slice(0, 2), to: m.slice(2) });
  assert.equal(mate.getWinner(), "b");
  const rep = new ChessCore();
  for (const m of [
    "g1f3",
    "g8f6",
    "f3g1",
    "f6g8",
    "g1f3",
    "g8f6",
    "f3g1",
    "f6g8",
  ])
    rep.makeMove({ from: m.slice(0, 2), to: m.slice(2) });
  assert(rep.getState().isDraw);
});
test("Strong bot finds mate and uses completed search iterations", () => {
  const c = challenges.find((c) => c.id === "mate-1")!;
  const result = search(c.fen, { depth: 3, timeMs: 2500 });
  assert(result.depth >= 1);
  const board = new Chess(c.fen);
  applyUci(board, result.ranked[0].move);
  assert(board.isCheckmate());
  const cfg = [1, 2, 3, 4].map((l) => botConfig(l));
  assert(cfg.every((c, i) => !i || c.tolerance < cfg[i - 1].tolerance));
  const move = chooseBotMove(new Chess().fen(), 4, 50, () => 0);
  assert(move);
  applyUci(new Chess(), move!);
});
const a: Analysis = {
  score: 78,
  quality: 85,
  blunders: 1,
  missedCaptures: 1,
  hanging: 1,
  checks: 2,
  checkResponses: 2,
  material: 700,
  noticed: ["fork"],
  missed: ["defense"],
  positions: 18,
  review: {
    fen: challenges[0].fen,
    solutions: challenges[0].solutions,
    skill: "fork",
    prompt: "Найди вилку",
    explanation: "Две цели",
    ply: 0,
    loss: 320,
  },
};
const game = (
  id: string,
  result: "win" | "loss" | "draw" | "quit" = "win"
): GameRecord => ({
  id,
  result,
  reason: "checkmate",
  opponent: "dragon",
  level: 5,
  playerColor: "w",
  duration: 300000,
  moves: (() => {
    const c = challenges[0],
      b = new Chess(c.fen),
      u = c.solutions[0];
    applyUci(b, u);
    return [
      {
        from: u.slice(0, 2),
        to: u.slice(2, 4),
        before: c.fen,
        after: b.fen(),
        elapsed: 3000,
      },
    ];
  })(),
});
test("Only a real win earns first-win reward; duplicate result or review earns nothing", () => {
  let s = newWorld();
  s = saveGame(s, game("quit", "quit"));
  assert(!s.characterProgress.firstWinRewardClaimed);
  s = saveGame(s, game("draw", "draw"));
  assert(!s.characterProgress.firstWinRewardClaimed);
  s = saveGame(s, game("win"));
  assert(s.characterProgress.firstWinRewardClaimed);
  assert.deepEqual(saveGame(s, game("win")), s);
  s = applyAnalysis(s, "win", a);
  s = completeReview(s, "win");
  assert.equal(s.mastery.fork.practice, 8);
  assert.deepEqual(completeReview(s, "win"), s);
});
test("Real game skill transfers to map, assessment uses move signals, adaptive updates stay bounded", () => {
  let s = completeChallenge(newWorld(), challenges[0]);
  s = saveGame(s, game("1"));
  s = applyAnalysis(s, "1", a);
  assert(s.mastery.fork.realGame > 0);
  assert(s.mastery.defense.relevance > 0);
  assert.equal(s.player.assessedGames, 1);
  assert(s.worldProgress.milestones.includes("applied-fork"));
  assert.deepEqual(applyAnalysis(s, "1", a), s);
  for (let i = 2; i < 6; i++) {
    const before = s.adaptiveOpponent.currentStrength;
    s = saveGame(s, game(String(i), "loss"));
    s = applyAnalysis(s, String(i), {
      ...a,
      score: 12,
      material: -1800,
      noticed: [],
    });
    assert(Math.abs(before - s.adaptiveOpponent.currentStrength) <= 4);
  }
  assert.equal(s.adaptiveOpponent.gamesPlayed, 5);
  assert.equal(s.adaptiveOpponent.losses, 4);
});
test("Post-game analysis finds a concrete missed fork and stores a legal retry", () => {
  const b = new Chess(challenges[0].fen),
    before = b.fen();
  b.move("Kf1");
  const after = b.fen();
  const g = game("review");
  g.moves = [{ before, after, from: "g1", to: "f1", elapsed: 4000 }];
  const analysis = analyzeGame(g);
  assert(analysis.review);
  assert.equal(analysis.review!.skill, "fork");
  applyUci(new Chess(analysis.review!.fen), analysis.review!.solutions[0]);
});
console.log(
  `\n${count} suites passed; ${challenges.length} challenge positions checked.`
);

test("Separate hero equipment, mastery and lifetime counters survive hero switching", () => {
  let s = selectCharacter(newWorld(), "inventor");
  for (const c of forSkill("fork").slice(0, 8)) s = completeChallenge(s, c);
  assert.equal(s.characters!.inventor.unlockedParts.length, 1);
  assert.equal(s.achievements!.puzzlesSolved, 8);
  assert.equal(s.achievements!.weeklyMeaningfulDays.length, 1);
  const points = s.mastery.fork.points;
  s = selectCharacter(s, "mage");
  assert.equal(s.characterProgress.equippedUpgrades.length, 0);
  assert.equal(s.mastery.fork.points, points);
  s = completeChallenge(s, forSkill("fork")[8]);
  assert.equal(s.characters!.mage.actions.puzzles, 1);
  s = selectCharacter(s, "inventor");
  assert.equal(s.characterProgress.equippedUpgrades[0], "inventor-0");
  assert.equal(s.characters!.inventor.actions.puzzles, 8);
});
test("Four balanced chapters preserve legal answers", () => {
  const all = forSkill("fork");
  assert.equal(all.length, 16);
  for (let i = 1; i <= 4; i++)
    assert.equal(all.filter((c) => c.chapter === i).length, 4);
  for (const c of all) {
    for (const choice of c.choices || []) applyUci(new Chess(c.fen), choice);
    if (c.kind === "defend" && c.id !== "fork-6") {
      const b = new Chess(c.fen);
      const m = applyUci(b, c.solutions[0]);
      assert.equal(
        m.captured,
        "n",
        c.id + " must remove the actual fork attacker"
      );
    }
  }
});

test("Actual forks produce a personal puzzle; enemy forks are detected", () => {
  const c = forSkill("fork")[0],
    b = new Chess(c.fen);
  applyUci(b, c.solutions[0]);
  const g = game("own-fork");
  g.moves = [
    { from: "e4", to: "d6", before: c.fen, after: b.fen(), elapsed: 3000 },
  ];
  const own = analyzeGame(g);
  assert.equal(own.forksFound, 1);
  assert.equal(own.review?.solutions[0], "e4d6");
  const enemy = analyzeGame({ ...g, playerColor: "b" });
  assert.equal(enemy.forksCaught, 1);
  assert(enemy.missed.includes("fork"));
});
test("Legacy save migration preserves the selected hero equipment and all solved ids", () => {
  let s = selectCharacter(newWorld(), "mage");
  delete s.characters;
  delete s.achievements;
  s.worldProgress.completedChallenges = ["fork-1", "fork-2"];
  s.characterProgress.unlockedUpgrades = ["part-1", "part-2"];
  storage.set("gosha-world-v1", JSON.stringify(s));
  const migrated = loadWorld();
  assert.deepEqual(
    migrated.worldProgress.completedChallenges,
    s.worldProgress.completedChallenges
  );
  assert.equal(migrated.characters!.mage.unlockedParts.length, 2);
  assert.equal(migrated.characters!.inventor.unlockedParts.length, 0);
  assert.equal(migrated.achievements!.puzzlesSolved, 2);
});
test("Better replay updates best result without duplicate rewards", () => {
  let s = completeChallenge(newWorld(), challenges[0], {
    attempts: 3,
    assisted: true,
  });
  const score = s.characters!.inventor.progress;
  s = completeChallenge(s, challenges[0], { attempts: 1, assisted: false });
  assert.deepEqual(s.challengeResults![challenges[0].id], {
    attempts: 1,
    assisted: false,
  });
  assert.equal(s.characters!.inventor.progress, score);
  assert.equal(s.achievements!.puzzlesSolved, 1);
});
console.log(count + " total suites passed");
test("No duplicated boards, including rotations, reflections and reversed piece colors", () => {
  const keys = challenges.map((c) => canonicalBoard(c.fen));
  assert.equal(new Set(keys).size, challenges.length);
  for (const skill of ["fork", "mate", "defense", "pin", "doubleAttack"]) {
    const list = forSkill(skill);
    assert.equal(list.length, skill === "fork" ? 16 : 12);
    for (let chapter = 1; chapter <= 4; chapter++)
      assert.equal(
        list.filter((c) => c.chapter === chapter).length,
        list.length / 4
      );
    assert(
      list
        .slice(1)
        .every(
          (c) => new Chess(c.fen).board().flat().filter(Boolean).length >= 8
        )
    );
    assert(
      list
        .slice(-3)
        .every(
          (c) => new Chess(c.fen).board().flat().filter(Boolean).length >= 14
        )
    );
  }
});
test("Every new training objective has exactly one legal solution, independent of the stored answer", () => {
  for (const c of challenges.filter((c) => c.objective || c.skill === "mate"))
    assert.deepEqual(trainingAnswers(c), c.solutions, c.id);
});
test("Real PGN round-trips to every recorded FEN; forged moment cannot earn a reward", () => {
  const b = new Chess(),
    moves: GameRecord["moves"] = [];
  for (const u of [
    "e2e4",
    "e7e5",
    "d1h5",
    "b8c6",
    "f1c4",
    "g8f6",
    "a2a3",
    "a7a6",
  ]) {
    const before = b.fen();
    const m = applyUci(b, u);
    moves.push({
      from: m.from,
      to: m.to,
      before,
      after: b.fen(),
      elapsed: 3000,
    });
  }
  const g = archiveGame({ ...game("authentic", "loss"), moves }),
    replay = new Chess();
  replay.loadPgn(g.pgn!);
  assert.equal(replay.fen(), moves[moves.length - 1].after);
  assert.deepEqual(g.positions, [
    moves[0].before,
    ...moves.map((m) => m.after),
  ]);
  const analysis = analyzeGame(g);
  assert.equal(analysis.review?.skill, "mate");
  assert.equal(analysis.review?.ply, 6);
  assert(isGameReview(g, analysis.review!));
  assert(!analysis.review!.explanation.includes("две цели"));
  let s = saveGame(newWorld(), g);
  assert.equal(s.games[0].rewards!.heroSteps, 1);
  const steps = s.characters!.inventor.progress;
  s = applyAnalysis(s, g.id, {
    ...analysis,
    review: { ...analysis.review!, fen: challenges[0].fen },
  });
  assert.equal(s.games[0].analysis!.review, undefined);
  assert.deepEqual(completeReview(s, g.id), s);
  assert(s.characters!.inventor.progress >= steps);
  const corrupted = structuredClone(g);
  corrupted.moves[2].after = corrupted.moves[1].after;
  assert.throws(() => archiveGame(corrupted));
});
test("Result rewards match actual deltas, survive reload, and belong to the hero who played", () => {
  let s = selectCharacter(newWorld(), "knight");
  const g = { ...game("rewards", "loss"), characterId: "mage" as const };
  const before = s.characters!.mage.progress;
  s = saveGame(s, g);
  const afterGame = s.characters!.mage.progress;
  assert.equal(afterGame - before, s.games[0].rewards!.heroSteps);
  assert.equal(s.characters!.knight.progress, 0);
  const beforeSkill = s.mastery.fork.points;
  s = applyAnalysis(s, g.id, { ...a, review: undefined });
  assert.equal(
    s.mastery.fork.points - beforeSkill,
    s.games[0].rewards!.skills.fork
  );
  assert.equal(
    s.characters!.mage.progress - before,
    s.games[0].rewards!.heroSteps
  );
  assert.deepEqual(applyAnalysis(s, g.id, a), s);
  persistWorld(s);
  assert.deepEqual(loadWorld().games[0].rewards, s.games[0].rewards);
});
console.log(count + " final suites passed");
test("Slow-device one-ply fallback still recognizes a concrete missed fork", () => {
  const c = forSkill("fork")[0],
    b = new Chess(c.fen);
  b.move("Kf1");
  const g = {
    ...game("slow-fork"),
    moves: [
      { from: "g1", to: "f1", before: c.fen, after: b.fen(), elapsed: 3000 },
    ],
  };
  const r = analyzeGame(g, 0).review;
  assert(r);
  assert.equal(r.skill, "fork");
  assert(r.solutions.includes("e4d6"));
  assert(r.loss > 0);
});
test("Guest and two accounts retain separate worlds and active-game keys", () => {
  storage.delete("chezzies_auth");
  const guest = selectCharacter(newWorld(), "inventor");
  persistWorld(guest);
  const login = (userId: string) => storage.set("chezzies_auth", JSON.stringify({isLoggedIn:true,userId,email:userId+"@example.test"}));
  login("account-a");
  assert.equal(loadWorld().player.selectedCharacter, null);
  persistWorld(completeChallenge(selectCharacter(newWorld(), "mage"), forSkill("fork")[0]));
  const activeA = worldKey("gosha-world-active-v1");
  login("account-b");
  assert.equal(loadWorld().player.selectedCharacter, null);
  assert.notEqual(worldKey("gosha-world-active-v1"), activeA);
  persistWorld(selectCharacter(newWorld(), "knight"));
  login("account-a");
  assert.equal(loadWorld().player.selectedCharacter, "mage");
  assert.equal(loadWorld().worldProgress.completedChallenges.length, 1);
  storage.delete("chezzies_auth");
  assert.equal(loadWorld().player.selectedCharacter, "inventor");
  assert.equal(loadWorld().worldProgress.completedChallenges.length, 0);
});
test("Walking accelerates, moves forward steadily, and brakes at the destination", () => {
  assert.equal(travelProgress(0),0); assert.equal(travelProgress(1),1);
  let previous=0;
  for(let i=1;i<=100;i++){const next=travelProgress(i/100);assert(next>previous);previous=next;}
  assert(Math.abs((travelProgress(.6)-travelProgress(.5))-(travelProgress(.5)-travelProgress(.4)))<1e-10);
  assert(travelProgress(.05) < travelProgress(.55)-travelProgress(.5));
});

test('Siege durability persists across stages and old equipment survives slower growth',()=>{let s=selectCharacter(newWorld(),'inventor');for(let n=0;n<=4;n++){(s.learning ||= {paths:{mate:{completed:[]}}} as any).paths.mate.completed=Array.from({length:n},(_,i)=>i+1);assert.equal(gateDurability(s,'mate'),[100,70,50,30,0][n]);}s.characters!.inventor.progress=16;s.characters!.inventor.unlockedParts=['inventor-0','inventor-1','inventor-2','inventor-3'];s.characters!.inventor.equippedParts=[...s.characters!.inventor.unlockedParts];s=syncGrowth(s);assert.equal(s.characters!.inventor.equippedParts.length,4);assert.equal(partThresholds[3],70);let fresh=selectCharacter(newWorld(),'mage');for(const c of forSkill('mate'))fresh=completeChallenge(fresh,c);assert(fresh.characters!.mage.unlockedParts.length<4);});
