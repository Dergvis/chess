import { Chess, type Square } from 'chess.js';

/** Why a move the player tried is not allowed (also sent as `reason` of `game:move_rejected`). */
export type RejectReason = 'in_check' | 'pinned' | 'into_check' | 'castle_moved' | 'castle_blocked' | 'castle_check' | 'blocked' | 'not_legal';
type PieceCode = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export interface MoveVerdict { reason: RejectReason; piece: PieceCode }

const at = (s: string) => ({ f: s.charCodeAt(0) - 97, r: Number(s[1]) - 1 });
const name = (f: number, r: number) => String.fromCharCode(97 + f) + (r + 1);
const between = (from: string, to: string): string[] => {
  const a = at(from), b = at(to), df = Math.sign(b.f - a.f), dr = Math.sign(b.r - a.r), out: string[] = [];
  for (let f = a.f + df, r = a.r + dr; f !== b.f || r !== b.r; f += df, r += dr) out.push(name(f, r));
  return out;
};

/**
 * Explains why `from`→`to` is not a legal move for the side to move, most specific reason first.
 * Returns null when the move is legal (or the position can't be read): then nothing should be explained.
 * A king "move" onto its own rook (or two squares sideways) is treated as a castling attempt.
 */
export function explainMove(fen: string, from: string, to: string): MoveVerdict | null {
  let chess: Chess;
  try { chess = new Chess(fen, { skipValidation: true }); } catch { return null; }
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to) || from === to) return null;
  const piece = chess.get(from as Square), target = chess.get(to as Square), color = chess.turn();
  if (!piece || piece.color !== color) return null;
  let moves: { to: string; flags: string }[];
  try { moves = chess.moves({ square: from as Square, verbose: true }); } catch { return null; }
  if (moves.some(m => m.to === to)) return null;
  const type = piece.type as PieceCode, a = at(from), b = at(to), dx = b.f - a.f, dy = b.r - a.r;
  const v = (reason: RejectReason): MoveVerdict => ({ reason, piece: type });
  const home = color === 'w' ? 0 : 7;
  const ownRook = target?.color === color && target.type === 'r';
  if (type === 'k' && a.f === 4 && a.r === home && dy === 0 && (Math.abs(dx) === 2 || ownRook)) {
    const side = dx > 0 ? 'k' : 'q', rook = name(side === 'k' ? 7 : 0, home), rookPiece = chess.get(rook as Square);
    if (moves.some(m => m.flags.includes(side))) return null;
    if (!chess.getCastlingRights(color)[side === 'k' ? 'k' : 'q'] || rookPiece?.type !== 'r' || rookPiece.color !== color) return v('castle_moved');
    if (between(from, rook).some(s => chess.get(s as Square))) return v('castle_blocked');
    return v('castle_check');
  }
  if (chess.inCheck()) return v('in_check');
  if (target?.color === color) return v('not_legal');
  const line = dx === 0 || dy === 0, diag = Math.abs(dx) === Math.abs(dy);
  let geometric = false;
  if (type === 'n') geometric = (Math.abs(dx) === 1 && Math.abs(dy) === 2) || (Math.abs(dx) === 2 && Math.abs(dy) === 1);
  else if (type === 'k') geometric = Math.max(Math.abs(dx), Math.abs(dy)) === 1;
  else if (type === 'p') {
    const dir = color === 'w' ? 1 : -1, start = color === 'w' ? 1 : 6;
    if (dx === 0 && dy === dir) geometric = !target;
    else if (dx === 0 && dy === 2 * dir && a.r === start) geometric = !target && !chess.get(name(a.f, a.r + dir) as Square);
    else if (Math.abs(dx) === 1 && dy === dir) geometric = !!target || fen.split(' ')[3] === to;
  } else if ((type === 'r' && line) || (type === 'b' && diag) || (type === 'q' && (line || diag))) {
    if (between(from, to).some(s => chess.get(s as Square))) return v('blocked');
    geometric = true;
  }
  if (geometric) return v(type === 'k' ? 'into_check' : 'pinned');
  return v('not_legal');
}

/** The king's target square when the selected king is tapped onto its own rook and that castling is legal. */
export function castleByRook(fen: string, from: string, to: string): string | null {
  let chess: Chess;
  try { chess = new Chess(fen, { skipValidation: true }); } catch { return null; }
  const king = chess.get(from as Square), rook = chess.get(to as Square), color = chess.turn();
  if (king?.type !== 'k' || king.color !== color || rook?.type !== 'r' || rook.color !== color || from[1] !== to[1]) return null;
  const side = to > from ? 'k' : 'q';
  let moves: { to: string; flags: string }[];
  try { moves = chess.moves({ square: from as Square, verbose: true }); } catch { return null; }
  return moves.find(m => m.flags.includes(side))?.to ?? null;
}

// Full sentences so the Spanish build can translate each one (docs/i18n/es.json).
const BLOCKED: Partial<Record<PieceCode, string>> = {
  r: "The rook can't jump over other pieces.",
  b: "The bishop can't jump over other pieces.",
  q: "The queen can't jump over other pieces.",
};
const CANT: Record<PieceCode, string> = {
  k: "The king can't move there.",
  q: "The queen can't move there.",
  r: "The rook can't move there.",
  b: "The bishop can't move there.",
  n: "The knight can't move there.",
  p: "The pawn can't move there.",
};
/** A short, friendly sentence for the player. */
export function reasonText(v: MoveVerdict): string {
  switch (v.reason) {
    case 'in_check': return 'Your king is in check — protect it first.';
    case 'pinned': case 'into_check': return 'That move would leave your king in check.';
    case 'castle_moved': return "You can't castle: the king or this rook has already moved.";
    case 'castle_blocked': return 'To castle, the squares between the king and the rook must be empty.';
    case 'castle_check': return "You can't castle out of or through check.";
    case 'blocked': return BLOCKED[v.piece] || CANT[v.piece];
    default: return CANT[v.piece];
  }
}
