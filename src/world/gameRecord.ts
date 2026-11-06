import { Chess } from "chess.js";
import type { GameRecord, Review } from "./types";

/** Reconstruct exclusively from the actual move log. Reject broken FEN chains. */
export function archiveGame(game: GameRecord): GameRecord {
  const chess = new Chess(game.moves[0]?.before);
  const positions = [chess.fen()];
  for (const move of game.moves) {
    if (chess.fen() !== move.before)
      throw new Error("The game sequence is invalid");
    chess.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (chess.fen() !== move.after)
      throw new Error("The position does not match the played move");
    positions.push(chess.fen());
  }
  const result =
    game.result === "draw"
      ? "1/2-1/2"
      : game.result === "quit"
      ? "*"
      : (game.result === "win") === (game.playerColor === "w")
      ? "1-0"
      : "0-1";
  chess.header(
    "Event",
    "CHEZZIES · Arena",
    "Round",
    game.id,
    "White",
    game.playerColor === "w" ? "Player" : game.opponent,
    "Black",
    game.playerColor === "b" ? "Player" : game.opponent,
    "Result",
    result
  );
  return { ...game, pgn: chess.pgn(), positions };
}
export function isGameReview(game: GameRecord, review: Review) {
  const move = game.moves[review.ply];
  return (
    !!move &&
    (!review.gameId || review.gameId === game.id) &&
    move.before === review.fen &&
    new Chess(move.before).turn() === game.playerColor &&
    (!review.played ||
      review.played === move.from + move.to + (move.promotion || ""))
  );
}
