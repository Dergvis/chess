import { pieceLabel } from "./pieceLabels";
import "./ChessPiece.css";

interface ChessPieceProps {
  type: "p" | "n" | "b" | "r" | "q" | "k";
  color: "w" | "b";
  selected?: boolean;
  isLastMove?: boolean;
  isCheck?: boolean;
  captureAttacker?: boolean; // Фигура выполняет взятие (атакующая, прыгает)
  captureTarget?: boolean; // Фигура要被 взята (цель, исчезает)
  captureGhost?: boolean; // Ghost-фигура на клетке-источнике
}

export default function ChessPiece({
  type,
  color,
  selected,
  isLastMove,
  isCheck,
  captureAttacker,
  captureTarget,
  captureGhost,
}: ChessPieceProps) {
  const isWhite = color === "w";

  // Маппинг типов фигур на имена файлов
  const pieceTypeMap: Record<string, string> = {
    p: "p",
    n: "n",
    b: "b",
    r: "r",
    q: "q",
    k: "k",
  };

  const colorPrefix = isWhite ? "w" : "b";
  const pieceType = pieceTypeMap[type];
  const pieceSrc = `/assets/pieces/${colorPrefix}-${pieceType}.png`;

  return (
    <div
      className={`chess-piece piece-${type} ${
        isWhite ? "piece-white" : "piece-black"
      } ${selected ? "selected" : ""} ${isLastMove ? "last-move" : ""} ${
        isCheck ? "check" : ""
      } ${captureAttacker ? "capturing-attacker" : ""} ${
        captureTarget ? "capturing-target" : ""
      } ${captureGhost ? "capturing-ghost" : ""}`}
    >
      <img
        src={pieceSrc}
        alt={pieceLabel(type, color)}
        className="piece-image"
      />
    </div>
  );
}
