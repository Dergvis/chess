export const pieceNames = {
  p: "Pawn",
  n: "Knight",
  b: "Bishop",
  r: "Rook",
  q: "Queen",
  k: "King",
};
export const pieceSymbols = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};
export function pieceLabel(type: keyof typeof pieceNames, color: "w" | "b") {
  const feminine = type === "p" || type === "r";
  return (
    (color === "w"
      ? feminine
        ? "White"
        : "White"
      : feminine
      ? "Black"
      : "Black") +
    " " +
    pieceNames[type].toLowerCase() +
    " " +
    pieceSymbols[color][type]
  );
}
