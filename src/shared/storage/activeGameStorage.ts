import type { AppState, Color, DifficultyLevel, GameState, PieceType } from '../types';

const ACTIVE_GAME_KEY = 'chezzies_active_game';
const ACTIVE_GAME_TTL_MS = 24 * 60 * 60 * 1000;

export interface ActiveGameSnapshot {
  fen: string;
  moves: GameState['moves'];
  capturedPieces: { w: PieceType[]; b: PieceType[] };
  playerColor: Color;
  opponentId: string;
  difficulty: DifficultyLevel;
  pieceSkinId: string;
  appState: AppState;
  matchId: string;
  updatedAt: string;
}

export function saveActiveGameSnapshot(snapshot: ActiveGameSnapshot): void {
  try {
    localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('[ActiveGame] Failed to save snapshot:', error);
  }
}

export function getActiveGameSnapshot(): ActiveGameSnapshot | null {
  try {
    const raw = localStorage.getItem(ACTIVE_GAME_KEY);
    if (!raw) return null;

    const snapshot = JSON.parse(raw) as ActiveGameSnapshot;
    if (!snapshot.fen || !snapshot.playerColor || !snapshot.opponentId || !snapshot.difficulty || !snapshot.pieceSkinId) {
      return null;
    }

    const updatedAt = new Date(snapshot.updatedAt).getTime();
    if (!updatedAt || Date.now() - updatedAt > ACTIVE_GAME_TTL_MS) {
      clearActiveGameSnapshot();
      return null;
    }

    return snapshot;
  } catch (error) {
    console.warn('[ActiveGame] Failed to load snapshot:', error);
    return null;
  }
}

export function clearActiveGameSnapshot(): void {
  try {
    localStorage.removeItem(ACTIVE_GAME_KEY);
  } catch (error) {
    console.warn('[ActiveGame] Failed to clear snapshot:', error);
  }
}
