/**
 * The board the player is looking at, attached to a Help question instead of a screenshot.
 * Only the position, mode, bot level and the last refused move attempts — no personal data.
 */
export interface Refusal { from: string; to: string; piece: string; reason: string }
export interface BoardSnapshot { fen: string; mode: string; level?: number; refused: Refusal[] }

const FRESH_MS = 30 * 60 * 1000;
let current: (BoardSnapshot & { at: number }) | null = null;

export function setBoardPosition(mode: string, fen: string, level?: number) {
  if (current && current.mode === mode && current.level === level) { current.fen = fen; current.at = Date.now(); return; }
  current = { fen, mode, level, refused: [], at: Date.now() };
}
export function addRefusal(r: Refusal) {
  if (!current) return;
  current.refused = [...current.refused, r].slice(-5);
  current.at = Date.now();
}
/** The board shown in the last 30 minutes, if any. */
export function boardSnapshot(): BoardSnapshot | null {
  if (!current || Date.now() - current.at > FRESH_MS) return null;
  const { fen, mode, level, refused } = current;
  return { fen, mode, ...(level ? { level } : {}), refused };
}
