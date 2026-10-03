import { archiveGame } from "./gameRecord";
import { Chess, type Move, type Square } from "chess.js";
import type { Analysis, GameRecord, Review, Skill } from "./types";
export const values: Record<string, number> = {
  p: 100,
  n: 320,
  b: 335,
  r: 500,
  q: 900,
  k: 20000,
};
export const uci = (m: { from: string; to: string; promotion?: string }) =>
  m.from + m.to + (m.promotion || "");
export function applyUci(chess: Chess, move: string) {
  return chess.move({
    from: move.slice(0, 2),
    to: move.slice(2, 4),
    promotion: move[4],
  });
}
export function evaluate(chess: Chess): number {
  if (chess.isCheckmate()) return -100000;
  if (chess.isDraw()) return 0;
  let score = 0;
  for (const row of chess.board())
    for (const p of row)
      if (p) {
        const x = p.square.charCodeAt(0) - 97,
          y = Number(p.square[1]) - 1;
        const center = 7 - Math.abs(3.5 - x) - Math.abs(3.5 - y);
        const positional =
          p.type === "p"
            ? (p.color === "w" ? y : 7 - y) * 9
            : p.type === "n" || p.type === "b"
            ? center * 9
            : p.type === "k"
            ? -center * 3
            : center * 2;
        score += (p.color === "w" ? 1 : -1) * (values[p.type] + positional);
      }
  return score * (chess.turn() === "w" ? 1 : -1);
}
const ordered = (chess: Chess) =>
  chess.moves({ verbose: true }).sort((a, b) => priority(b) - priority(a));
const priority = (m: Move) =>
  (m.san.includes("#") ? 1e6 : 0) +
  (m.captured ? 10 * values[m.captured] - values[m.piece] : 0) +
  (m.promotion ? values[m.promotion] : 0) +
  (m.san.includes("+") ? 40 : 0);
export interface SearchOptions {
  depth: number;
  timeMs: number;
}
export function search(fen: string, options: SearchOptions) {
  const chess = new Chess(fen),
    deadline = Date.now() + options.timeMs;
  let nodes = 0,
    completedDepth = 0;
  const timeout = Symbol("timeout");
  const tick = () => {
    nodes++;
    if (completedDepth > 0 && (nodes & 31) === 0 && Date.now() > deadline)
      throw timeout;
  };
  function negamax(
    depth: number,
    alpha: number,
    beta: number,
    ply: number,
    qdepth = 0
  ): number {
    tick();
    if (chess.isCheckmate()) return -100000 + ply;
    if (chess.isDraw()) return 0;
    const inCheck = chess.inCheck();
    if (depth <= 0) {
      const stand = evaluate(chess);
      if (qdepth >= 4) return stand;
      if (!inCheck) {
        if (stand >= beta) return beta;
        alpha = Math.max(alpha, stand);
      }
      const tactical = ordered(chess).filter(
        (m) => inCheck || m.captured || m.promotion
      );
      for (const m of tactical) {
        chess.move(m);
        let score;
        try {
          score = -negamax(0, -beta, -alpha, ply + 1, qdepth + 1);
        } finally {
          chess.undo();
        }
        if (score >= beta) return beta;
        alpha = Math.max(alpha, score);
      }
      return alpha;
    }
    for (const m of ordered(chess)) {
      chess.move(m);
      let score;
      try {
        score = -negamax(depth - 1, -beta, -alpha, ply + 1);
      } finally {
        chess.undo();
      }
      if (score >= beta) return beta;
      alpha = Math.max(alpha, score);
    }
    return alpha;
  }
  let ranked = ordered(chess).map((m) => ({ move: uci(m), score: 0 }));
  // Only publish complete iterations: a deadline cannot bias play to early candidates.
  for (let depth = 1; depth <= options.depth; depth++) {
    try {
      // The first iteration is a cheap complete one-ply baseline. Quiescence then
      // improves deeper iterations without starving analysis of busy positions.
      const next = ranked.map(({ move }) => {
        applyUci(chess, move);
        let score;
        try {
          score = -negamax(depth - 1, -1e7, 1e7, 1, depth === 1 ? 4 : 0);
        } finally {
          chess.undo();
        }
        return { move, score };
      });
      ranked = next.sort((a, b) => b.score - a.score);
      completedDepth = depth;
      if (Date.now() > deadline) break;
    } catch (e) {
      if (e !== timeout) throw e;
      break;
    }
  }
  return { ranked, depth: completedDepth, nodes };
}
export function botConfig(level: number, strength = 35) {
  const fixed = [
    { depth: 1, timeMs: 180, tolerance: 750, random: 0.65 },
    { depth: 2, timeMs: 400, tolerance: 220, random: 0.22 },
    { depth: 3, timeMs: 850, tolerance: 65, random: 0.04 },
    { depth: 4, timeMs: 2000, tolerance: 12, random: 0 },
  ];
  if (level < 5) return fixed[Math.max(0, level - 1)];
  return {
    depth: strength < 25 ? 1 : strength < 50 ? 2 : strength < 75 ? 3 : 4,
    timeMs: 300 + strength * 16,
    tolerance: Math.round(380 * (1 - strength / 100) ** 2 + 15),
    random: Math.max(0, (45 - strength) / 250),
  };
}
export function chooseBotMove(
  fen: string,
  level: number,
  strength: number,
  rng = Math.random
) {
  const cfg = botConfig(level, strength),
    result = search(fen, cfg);
  if (!result.ranked.length) return null;
  if (rng() < cfg.random)
    return result.ranked[Math.floor(rng() * result.ranked.length)].move;
  const best = result.ranked[0].score,
    candidates = result.ranked.filter((m) => best - m.score <= cfg.tolerance);
  return candidates[Math.floor(rng() * candidates.length)].move;
}
// Geometric attack targets, with blockers. No turn swapping or illegal move generation.
export function targets(chess: Chess, square: Square): Square[] {
  const p = chess.get(square);
  if (!p) return [];
  const x = square.charCodeAt(0) - 97,
    y = Number(square[1]) - 1,
    out: Square[] = [];
  const dirs =
    p.type === "n"
      ? [
          [1, 2],
          [2, 1],
          [-1, 2],
          [-2, 1],
          [1, -2],
          [2, -1],
          [-1, -2],
          [-2, -1],
        ]
      : p.type === "p"
      ? [
          [1, p.color === "w" ? 1 : -1],
          [-1, p.color === "w" ? 1 : -1],
        ]
      : p.type === "b"
      ? [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]
      : p.type === "r"
      ? [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]
      : [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
  for (const [dx, dy] of dirs)
    for (let n = 1; n <= (["n", "p", "k"].includes(p.type) ? 1 : 7); n++) {
      const nx = x + dx * n,
        ny = y + dy * n;
      if (nx < 0 || nx > 7 || ny < 0 || ny > 7) break;
      const s = (String.fromCharCode(97 + nx) + (ny + 1)) as Square;
      out.push(s);
      if (chess.get(s)) break;
    }
  return out;
}
export function hanging(chess: Chess, color: "w" | "b") {
  const enemy = color === "w" ? "b" : "w";
  let n = 0;
  for (const row of chess.board())
    for (const p of row)
      if (
        p &&
        p.color === color &&
        p.type !== "k" &&
        chess.isAttacked(p.square, enemy) &&
        !chess.isAttacked(p.square, color)
      )
        n++;
  return n;
}
export function detectSkills(
  before: string,
  after: string,
  to: string
): Skill[] {
  const old = new Chess(before),
    chess = new Chess(after),
    p = chess.get(to as Square);
  if (!p) return [];
  const result: Skill[] = [];
  const victims = targets(chess, to as Square)
    .map((s) => chess.get(s))
    .filter((v) => v && v.color !== p.color && v.type !== "p");
  // Do not award a fork that loses its attacker immediately to an ordinary legal capture.
  const canTake = chess
    .moves({ verbose: true })
    .some(
      (m) =>
        m.to === to &&
        m.captured &&
        (values[m.piece] <= values[p.type] ||
          !chess.isAttacked(to as Square, p.color))
    );
  if (victims.length >= 2 && !canTake) {
    result.push("fork", "doubleAttack");
  }
  if (chess.isCheckmate()) result.push("mate");
  if (old.inCheck() || hanging(chess, p.color) < hanging(old, p.color))
    result.push("defense");
  if (["b", "r", "q"].includes(p.type)) {
    const x = to.charCodeAt(0),
      y = Number(to[1]);
    const dirs =
      p.type === "b"
        ? [
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
          ]
        : p.type === "r"
        ? [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]
        : [
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
    for (const [dx, dy] of dirs) {
      let blocker = false;
      for (let n = 1; n < 8; n++) {
        const a = x + dx * n,
          b = y + dy * n;
        if (a < 97 || a > 104 || b < 1 || b > 8) break;
        const v = chess.get((String.fromCharCode(a) + b) as Square);
        if (!v) continue;
        if (v.color === p.color) break;
        if (blocker) {
          if (v.type === "k") result.push("pin");
          break;
        }
        if (v.type === "k") break;
        blocker = true;
      }
    }
  }
  return [...new Set(result)];
}
export function analyzeGame(game: GameRecord, timePerPosition = 200): Analysis {
  game = archiveGame(game);
  let reviewPriority = Infinity;
  let totalLoss = 0,
    positions = 0,
    blunders = 0,
    missedCaptures = 0,
    exposed = 0,
    checks = 0,
    checkResponses = 0,
    forksFound = 0,
    forksCaught = 0;
  const noticed = new Set<Skill>(),
    missed = new Set<Skill>();
  let review: Review | undefined;
  for (let ply = 0; ply < game.moves.length; ply++) {
    const record = game.moves[ply],
      before = new Chess(record.before);
    if (before.turn() !== game.playerColor) {
      if (
        detectSkills(record.before, record.after, record.to).includes("fork")
      ) {
        forksCaught++;
        missed.add("fork");
      }
      continue;
    }
    const after = new Chess(record.after),
      played = uci(record),
      rank = search(record.before, { depth: 2, timeMs: timePerPosition });
    const best = rank.ranked[0];
    if (!best || rank.depth === 0) continue;
    const actual = rank.ranked.find((m) => m.move === played);
    if (!actual) continue;
    const loss = Math.max(0, Math.min(1000, best.score - actual.score));
    totalLoss += loss;
    positions++;
    if (loss >= 220) blunders++;
    exposed += Math.max(
      0,
      hanging(after, game.playerColor) - hanging(before, game.playerColor)
    );
    if (before.inCheck()) checkResponses++;
    if (after.inCheck()) checks++;
    const used = detectSkills(record.before, record.after, record.to);
    used.forEach((s) => noticed.add(s));
    if (used.includes("fork")) forksFound++;
    const options: {
      move: string;
      skill: Skill;
      motif: NonNullable<Review["motif"]>;
      priority: number;
      explanation: string;
      prompt: string;
    }[] = [];
    // A simple teachable event outranks centipawn loss. Every candidate is one actual legal move.
    for (const ranked of rank.ranked) {
      if (ranked.score < best.score - 65) continue;
      const candidate = new Chess(record.before),
        m = applyUci(candidate, ranked.move);
      const tactics = detectSkills(record.before, candidate.fen(), m.to);
      const captured =
        !!m.captured &&
        values[m.captured] >= 300 &&
        !candidate.isAttacked(m.to, candidate.turn());
      const saved =
        hanging(before, game.playerColor) >
          hanging(candidate, game.playerColor) && !before.inCheck();
      const mate = candidate.isCheckmate(),
        different = ranked.move !== played;
      // On a slow device the complete one-ply fallback cannot price a fork yet.
      // A safe check attacking a more valuable piece is still a concrete teaching event.
      const forcingFork =
        tactics.includes("fork") &&
        candidate.inCheck() &&
        !used.includes("fork") &&
        targets(candidate, m.to).some((square) => {
          const p = candidate.get(square);
          return (
            p &&
            p.color !== game.playerColor &&
            p.type !== "k" &&
            values[p.type] >= values[m.piece] + 100
          );
        });
      if (different && !mate && loss < 100 && !forcingFork) continue;
      let skill: Skill | undefined,
        motif: NonNullable<Review["motif"]> = "defense",
        priority = 99,
        prompt = "",
        explanation = "";
      if (mate) {
        skill = "mate";
        motif = "mate";
        priority = different ? 0 : 1;
        prompt = "Find checkmate in one move.";
        explanation = "The king has no escape from this check. Checkmate!";
      } else if (saved) {
        skill = "defense";
        motif = "save";
        priority = 2;
        prompt = "Save the piece your opponent is attacking.";
        explanation =
          "The piece is safe: your opponent can no longer capture it.";
      } else if (tactics.includes("fork")) {
        skill = "fork";
        motif = "fork";
        priority = 3;
        prompt = "Find a move that attacks two pieces at once.";
        explanation = "One piece attacks two targets at once.";
      } else if (
        tactics.includes("pin") &&
        !candidate.isAttacked(m.to, candidate.turn())
      ) {
        skill = "pin";
        motif = "pin";
        priority = 4;
        prompt = "Pin the piece to the king behind it.";
        explanation = "The piece shields its king and cannot leave the line.";
      } else if (captured) {
        skill = "defense";
        motif = "capture";
        priority = 6;
        prompt = "Find a piece you can safely capture.";
        explanation = "You captured a piece and kept your own protected.";
      } else if (before.inCheck()) {
        skill = "defense";
        priority = 7;
        prompt = "Find a defense against check.";
        explanation = "The check is stopped. Your king is safe.";
      }
      if (skill)
        options.push({
          move: ranked.move,
          skill,
          motif,
          priority,
          explanation,
          prompt,
        });
    }
    options.sort((a, b) => a.priority - b.priority);
    const chosen = options[0];
    if (chosen && chosen.priority < reviewPriority) {
      const solutions = options
        .filter((o) => o.motif === chosen.motif)
        .map((o) => o.move);
      const repeating = solutions.includes(played);
      review = {
        gameId: game.id,
        fen: record.before,
        solutions,
        skill: chosen.skill,
        motif: chosen.motif,
        played,
        prompt: repeating
          ? "You found a strong move. Show it again."
          : chosen.prompt,
        explanation: chosen.explanation,
        ply,
        loss: repeating ? 0 : Math.max(1, loss),
      };
      reviewPriority = chosen.priority;
      if (!repeating) missed.add(chosen.skill);
    }
    const bestBoard = new Chess(record.before),
      bm = applyUci(bestBoard, best.move);
    if (
      bm.captured &&
      values[bm.captured] >= 300 &&
      !bestBoard.isAttacked(bm.to, bestBoard.turn()) &&
      played !== best.move &&
      loss >= 100
    )
      missedCaptures++;
  }
  const last = game.moves[game.moves.length - 1],
    end = last ? new Chess(last.after) : new Chess();
  let material = 0;
  for (const row of end.board())
    for (const p of row)
      if (p && p.type !== "k")
        material += (p.color === game.playerColor ? 1 : -1) * values[p.type];
  const quality = positions ? Math.max(0, 100 - totalLoss / positions / 4) : 35;
  const score = Math.max(
    5,
    Math.min(
      95,
      Math.round(
        0.65 * quality +
          15 -
          (10 * blunders) / Math.max(1, positions) +
          Math.min(8, noticed.size * 2) +
          Math.max(-7, Math.min(7, material / 180)) +
          (game.result === "win" ? 5 : game.result === "loss" ? -3 : 0)
      )
    )
  );
  return {
    score,
    quality,
    blunders,
    missedCaptures,
    hanging: exposed,
    checks,
    checkResponses,
    material,
    noticed: [...noticed],
    missed: [...missed],
    review,
    positions,
    forksFound,
    forksCaught,
  };
}
