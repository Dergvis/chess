/**
 * Player Progress Storage — сохранение прогресса игрока
 * Для MVP используется localStorage
 */

import type {
  PlayerProgress,
  PlayerStats,
  MatchRecord,
  Currencies,
  PlayerLevel,
  Achievement,
  DailyMissionsState,
  Chest,
  PlayerHeroId,
} from '../types/progress';
import { xpForLevel, MAX_LEVEL } from '../types/progress';

const PROGRESS_KEY = 'chezzies_player_progress';

function defaultStats(): PlayerStats {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
    winStreak: 0,
    bestWinStreak: 0,
    checkmatesDealt: 0,
    totalGamesPlayed: 0,
    totalTimePlayedSeconds: 0,
    favoritePiece: {},
    winsWithoutLosses: 0,
    dailyLoginStreak: 0,
    lastLoginDate: null,
  };
}

function defaultCurrencies(): Currencies {
  return { xp: 0, crystals: 10, trophies: 0 };
}

function defaultLevel(): PlayerLevel {
  return { level: 1, xp: 0, xpToNextLevel: xpForLevel(1) };
}

function defaultProgress(): PlayerProgress {
  return {
    selectedHero: null,
    heroSelectionCompleted: false,
    currencies: defaultCurrencies(),
    level: defaultLevel(),
    stats: defaultStats(),
    matchHistory: [],
    achievements: {},
    dailyMissions: { date: '', missions: [] },
    chests: [],
    lastGameDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Получить прогресс игрока
 */
export function hasSavedPlayerProgress(): boolean {
  try {
    return Boolean(localStorage.getItem(PROGRESS_KEY));
  } catch {
    return false;
  }
}

export function getPlayerProgress(): PlayerProgress {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultProgress(), ...parsed };
    }
  } catch (error) {
    console.error('Error loading player progress:', error);
  }
  return defaultProgress();
}

/**
 * Сохранить прогресс
 */
export function savePlayerProgress(progress: Partial<PlayerProgress>): void {
  try {
    const current = getPlayerProgress();
    const updated = { ...current, ...progress, updatedAt: new Date().toISOString() };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving player progress:', error);
  }
}

/**
 * Обновить отдельное поле
 */
export function replacePlayerProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error replacing player progress:', error);
  }
}

export function updateProgress<K extends keyof PlayerProgress>(
  key: K,
  value: PlayerProgress[K]
): void {
  savePlayerProgress({ [key]: value } as Partial<PlayerProgress>);
}

/**
 * Выбрать героя
 */
export function selectHero(heroId: PlayerHeroId): void {
  savePlayerProgress({
    selectedHero: heroId,
    heroSelectionCompleted: true,
  });
}

/**
 * Начислить XP за матч
 */
export function awardMatchXp(params: {
  won: boolean;
  isCheckmate: boolean;
  winStreak: number;
  isFlawless: boolean; // победа без потерь
}): number {
  const progress = getPlayerProgress();
  let totalXp = 0;

  if (params.won) {
    totalXp += 50; // победа
  }
  if (params.isCheckmate) {
    totalXp += 25; // мат
  }
  if (params.winStreak >= 3) {
    totalXp += 100; // серия побед
  }
  if (params.isFlawless) {
    totalXp += 150; // победа без потерь
  }

  // Начисляем XP
  const newCurrencies = { ...progress.currencies, xp: progress.currencies.xp + totalXp };

  // Проверяем уровень
  const newLevel = calculateLevel(newCurrencies.xp);

  savePlayerProgress({
    currencies: newCurrencies,
    level: newLevel,
  });

  return totalXp;
}

/**
 * Рассчитать уровень на основе общего XP
 */
export function calculateLevel(totalXp: number): PlayerLevel {
  let level = 1;
  let xpSpent = 0;

  for (let i = 1; i <= MAX_LEVEL; i++) {
    const needed = xpForLevel(i);
    if (totalXp >= xpSpent + needed) {
      xpSpent += needed;
      level = i;
    } else {
      break;
    }
  }

  const currentLevelXp = totalXp - xpSpent;
  const nextLevelNeeded = level < MAX_LEVEL ? xpForLevel(level + 1) : 0;

  return {
    level,
    xp: currentLevelXp,
    xpToNextLevel: level < MAX_LEVEL ? nextLevelNeeded - currentLevelXp : 0,
  };
}

/**
 * Обновить статистику после матча
 */
export function recordMatchResult(params: {
  won: boolean;
  lost: boolean;
  isDraw: boolean;
  isCheckmate: boolean;
  opponentName: string;
  opponentAvatar: string;
  moves: number;
  reason: string;
  playerColor: 'w' | 'b';
  xpGained: number;
  matchId?: string;
  capturedOwnPieces: number; // сколько своих фигур потерял
  capturedEnemyPieces: number; // сколько фигур противника съел
}): void {
  const progress = getPlayerProgress();
  const existingMatch = params.matchId
    ? progress.matchHistory.find(match => match.matchId === params.matchId)
    : null;

  if (existingMatch) {
    console.warn('[Progress] Duplicate match result ignored:', params.matchId);
    return;
  }

  const stats = { ...progress.stats };
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  stats.totalGamesPlayed += 1;

  if (params.won) {
    stats.wins += 1;
    stats.winStreak += 1;
    if (stats.winStreak > stats.bestWinStreak) {
      stats.bestWinStreak = stats.winStreak;
    }
    if (params.isCheckmate) {
      stats.checkmatesDealt += 1;
    }
    // Победа без потерь — не потерял ни одной фигуры
    if (params.capturedOwnPieces === 0) {
      stats.winsWithoutLosses += 1;
    }
  } else if (params.lost) {
    stats.losses += 1;
    stats.winStreak = 0;
  } else {
    stats.draws += 1;
    stats.winStreak = 0;
  }

  // Обновляем серию ежедневных входов
  if (stats.lastLoginDate !== todayStr) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (stats.lastLoginDate === yesterdayStr) {
      stats.dailyLoginStreak += 1;
    } else if (stats.lastLoginDate !== todayStr) {
      stats.dailyLoginStreak = 1;
    }
    stats.lastLoginDate = todayStr;
  }

  // История матчей (храним последние 20)
  const matchRecord: MatchRecord = {
    id: params.matchId || `match_${Date.now()}`,
    matchId: params.matchId,
    date: new Date().toISOString(),
    result: params.won ? 'win' : params.lost ? 'lose' : 'draw',
    opponentName: params.opponentName,
    opponentAvatar: params.opponentAvatar,
    xpGained: params.xpGained,
    moves: params.moves,
    reason: params.reason,
    playerColor: params.playerColor,
  };

  const newHistory = [matchRecord, ...progress.matchHistory].slice(0, 20);

  savePlayerProgress({
    stats,
    matchHistory: newHistory,
    lastGameDate: new Date().toISOString(),
  });
}

/**
 * Получить кубки на основе винрейта
 */
export function calculateTrophies(stats: PlayerStats): number {
  const total = stats.wins + stats.losses + stats.draws;
  if (total === 0) return 0;
  const winRate = stats.wins / total;
  return Math.floor(stats.wins * 10 + stats.bestWinStreak * 25 + winRate * 50);
}

/**
 * Обновить кубки
 */
export function updateTrophies(): void {
  const progress = getPlayerProgress();
  const trophies = calculateTrophies(progress.stats);
  savePlayerProgress({
    currencies: { ...progress.currencies, trophies },
  });
}

/**
 * Сбросить прогресс (для тестирования)
 */
export function resetProgress(): void {
  localStorage.removeItem(PROGRESS_KEY);
}

export default {
  hasSavedPlayerProgress,
  getPlayerProgress,
  savePlayerProgress,
  replacePlayerProgress,
  updateProgress,
  selectHero,
  awardMatchXp,
  recordMatchResult,
  calculateTrophies,
  updateTrophies,
  resetProgress,
};
