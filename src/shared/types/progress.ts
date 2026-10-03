/**
 * Типы для системы героя и прогресса игрока
 */

// ===== Герои игрока =====

export type PlayerHeroId = 'knight' | 'mage' | 'inventor';

export type HeroEvolutionStage = 'base' | 'armored' | 'glowing' | 'pet' | 'legendary';

export interface PlayerHero {
  id: PlayerHeroId;
  name: string;
  description: string;
  avatar: string; // emoji или путь к изображению
  video?: string; // путь к видео для выбранного героя
  color: string;
  secondaryColor: string;
  emotion: HeroEmotion;
  evolutionStage: HeroEvolutionStage;
}

export type HeroEmotion = 'idle' | 'happy' | 'sad' | 'excited' | 'determined' | 'celebrating';

// ===== Валюты =====

export interface Currencies {
  xp: number;        // опыт
  crystals: number;  // кристаллы 💎
  trophies: number;  // кубки 👑
}

// ===== Статистика =====

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestWinStreak: number;
  checkmatesDealt: number;
  totalGamesPlayed: number;
  totalTimePlayedSeconds: number;
  favoritePiece: Record<string, number>; // фигура → количество использований
  winsWithoutLosses: number; // победы без потерь
  dailyLoginStreak: number;
  lastLoginDate: string | null; // ISO date
}

// ===== Уровни =====

export interface PlayerLevel {
  level: number;           // текущий уровень (1-20)
  xp: number;              // текущий XP
  xpToNextLevel: number;   // XP до следующего уровня
}

// ===== История матчей =====

export interface MatchRecord {
  id: string;
  date: string;           // ISO timestamp
  result: 'win' | 'lose' | 'draw';
  opponentName: string;
  opponentAvatar: string;
  xpGained: number;
  moves: number;
  reason: string;         // 'checkmate' | 'stalemate' | 'draw' | 'resign'
  playerColor: 'w' | 'b';
  matchId?: string;
}

// ===== Достижения =====

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  progress: number;       // текущий прогресс
  maxProgress: number;    // сколько нужно для получения
  unlocked: boolean;
  unlockedAt?: string;    // ISO timestamp
  xpReward: number;
  crystalReward: number;
}

export type AchievementCategory = 'wins' | 'combo' | 'tactics' | 'activity';

// ===== Ежедневные задания =====

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  claimed: boolean;
  xpReward: number;
  crystalReward: number;
}

export interface DailyMissionsState {
  date: string;           // дата генерации (YYYY-MM-DD)
  missions: DailyMission[];
}

// ===== Сундуки =====

export type ChestType = 'common' | 'rare' | 'epic' | 'legendary';

export interface Chest {
  id: string;
  type: ChestType;
  name: string;
  icon: string;
  rewards: ChestReward[];
}

export interface ChestReward {
  type: 'xp' | 'crystals' | 'cosmetic' | 'emotion';
  amount: number;
  item?: string; // для косметики/эмоций
}

// ===== Полное состояние прогресса =====

export interface PlayerProgress {
  selectedHero: PlayerHeroId | null;
  heroSelectionCompleted: boolean;
  currencies: Currencies;
  level: PlayerLevel;
  stats: PlayerStats;
  matchHistory: MatchRecord[];
  achievements: Record<string, Achievement>;
  dailyMissions: DailyMissionsState;
  chests: Chest[];
  lastGameDate: string | null;
  createdAt: string;
  updatedAt?: string;
  accountEmail?: string;
}

// ===== Начисление XP =====

export interface XpSource {
  win: number;            // +50
  checkmate: number;      // +25
  winStreak: number;      // +100 (за серию)
  dailyLogin: number;     // +20
  missionComplete: number;// +75
  flawlessVictory: number;// +150
}

// ===== XP за уровень =====
// Уровень N требует N * 100 XP для достижения
export function xpForLevel(level: number): number {
  return level * 100;
}

// Максимальный уровень
export const MAX_LEVEL = 20;

// Эволюции
export const EVOLUTION_LEVELS: Record<HeroEvolutionStage, number> = {
  base: 1,
  armored: 5,
  glowing: 10,
  pet: 15,
  legendary: 20,
};
