import { Chess, type Square } from "chess.js";
import { detectSkills, targets, uci } from "./engine";
import type { Challenge } from "./types";
/** Objective-based answers are independent of the chosen engine line. */
export function trainingAnswers(
  c: Pick<Challenge, "fen" | "skill" | "objective" | "rescueSquare">
) {
  const before = new Chess(c.fen),
    color = before.turn(),
    enemy = color === "w" ? "b" : "w",
    legal = before.moves({ verbose: true });
  return legal
    .filter((m) => {
      const after = new Chess(c.fen);
      after.move(m);
      if (c.skill === "mate") return after.isCheckmate();
      if (c.objective === "onlyEscape")
        return before.inCheck() && legal.length === 1;
      if (c.objective === "rescue") {
        const square = c.rescueSquare as Square,
          p = before.get(square);
        return (
          !!p &&
          p.color === color &&
          before.isAttacked(square, enemy) &&
          !!m.captured &&
          targets(before, m.to).includes(square) &&
          (!after.get(square) || !after.isAttacked(square, enemy)) &&
          !after.isAttacked(m.to, enemy)
        );
      }
      const motifs = detectSkills(c.fen, after.fen(), m.to);
      if (c.objective === "newPin")
        return (
          motifs.includes("pin") &&
          !after.isAttacked(m.to, enemy) &&
          !detectSkills(c.fen, c.fen, m.from).includes("pin")
        );
      if (c.objective === "safeFork" || c.objective === "safeDouble")
        return (
          motifs.includes("fork") &&
          !after.isCheckmate() &&
          ["n", "p"].includes(m.piece) === (c.objective === "safeFork")
        );
      return motifs.includes(c.skill);
    })
    .map(uci);
}
/** Ignore orientation and color when detecting duplicate training boards. */
export function canonicalBoard(fen: string) {
  const pieces = new Chess(fen).board().flat().filter(Boolean);
  const forms: string[] = [];
  for (let reflection = 0; reflection < 2; reflection++)
    for (let rotations = 0; rotations < 4; rotations++)
      for (let invert = 0; invert < 2; invert++) {
        const items = pieces
          .map((p) => {
            let x = p!.square.charCodeAt(0) - 97,
              y = Number(p!.square[1]) - 1;
            if (reflection) x = 7 - x;
            for (let i = 0; i < rotations; i++) [x, y] = [7 - y, x];
            return `${x}${y}${p!.type}${
              invert ? (p!.color === "w" ? "b" : "w") : p!.color
            }`;
          })
          .sort();
        forms.push(items.join(","));
      }
  return forms.sort()[0];
}
