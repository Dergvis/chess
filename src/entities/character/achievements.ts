/**
 * Система достижений
 */

import type { Achievement, PlayerStats } from '../../shared/types/progress';

// Базовые достижения MVP
export const ACHIEVEMENTS_TEMPLATE: Record<string, Omit<Achievement, 'progress' | 'unlocked'>> = {
  first_win: {
    id: 'first_win',
    title: "First victory!",
    description: "Win your first game",
    icon: '🏆',
    rarity: 'common',
    maxProgress: 1,
    xpReward: 50,
    crystalReward: 5,
  },
  ten_wins: {
    id: 'ten_wins',
    title: "Ten victories",
    description: "Win 10 games",
    icon: '⭐',
    rarity: 'common',
    maxProgress: 10,
    xpReward: 100,
    crystalReward: 10,
  },
  hundred_wins: {
    id: 'hundred_wins',
    title: "A hundred victories",
    description: "Win 100 games",
    icon: '💯',
    rarity: 'legendary',
    maxProgress: 100,
    xpReward: 500,
    crystalReward: 50,
  },
  three_streak: {
    id: 'three_streak',
    title: "On fire!",
    description: "Win 3 games in a row",
    icon: '🔥',
    rarity: 'rare',
    maxProgress: 3,
    xpReward: 75,
    crystalReward: 10,
  },
  ten_streak: {
    id: 'ten_streak',
    title: "Unstoppable!",
    description: "Win 10 games in a row",
    icon: '👑',
    rarity: 'legendary',
    maxProgress: 10,
    xpReward: 300,
    crystalReward: 30,
  },
  first_checkmate: {
    id: 'first_checkmate',
    title: "First checkmate!",
    description: "Give your first checkmate",
    icon: '♟️',
    rarity: 'common',
    maxProgress: 1,
    xpReward: 50,
    crystalReward: 5,
  },
  fifty_checkmates: {
    id: 'fifty_checkmates',
    title: "Checkmate master",
    description: "Give 50 checkmates",
    icon: '💥',
    rarity: 'epic',
    maxProgress: 50,
    xpReward: 200,
    crystalReward: 25,
  },
  flawless_victory: {
    id: 'flawless_victory',
    title: "No losses!",
    description: "Win a game without losing a piece",
    icon: '🛡️',
    rarity: 'rare',
    maxProgress: 1,
    xpReward: 150,
    crystalReward: 20,
  },
  eat_queen: {
    id: 'eat_queen',
    title: "Captured the queen!",
    description: "Capture an enemy queen",
    icon: '👸',
    rarity: 'rare',
    maxProgress: 1,
    xpReward: 75,
    crystalReward: 10,
  },
  seven_days: {
    id: 'seven_days',
    title: "A week of chess!",
    description: "Play for 7 days in a row",
    icon: '📅',
    rarity: 'epic',
    maxProgress: 7,
    xpReward: 200,
    crystalReward: 25,
  },
  twenty_missions: {
    id: 'twenty_missions',
    title: "Mission explorer",
    description: "Complete 20 daily missions",
    icon: '📋',
    rarity: 'epic',
    maxProgress: 20,
    xpReward: 200,
    crystalReward: 25,
  },
};

/**
 * Инициализировать достижения
 */
export function initAchievements(): Record<string, Achievement> {
  const achievements: Record<string, Achievement> = {};
  for (const [key, template] of Object.entries(ACHIEVEMENTS_TEMPLATE)) {
    achievements[key] = {
      ...template,
      progress: 0,
      unlocked: false,
    };
  }
  return achievements;
}

/**
 * Обновить прогресс достижений на основе статистики
 */
export function updateAchievementsProgress(
  achievements: Record<string, Achievement>,
  stats: PlayerStats,
  newAchievements: string[] = []
): { achievements: Record<string, Achievement>; newUnlocked: string[] } {
  const updated = { ...achievements };
  const newUnlocked: string[] = [];

  // Обновляем на основе статистики
  if (updated.first_win) {
    updated.first_win.progress = Math.min(stats.wins, updated.first_win.maxProgress);
  }
  if (updated.ten_wins) {
    updated.ten_wins.progress = Math.min(stats.wins, updated.ten_wins.maxProgress);
  }
  if (updated.hundred_wins) {
    updated.hundred_wins.progress = Math.min(stats.wins, updated.hundred_wins.maxProgress);
  }
  if (updated.three_streak) {
    updated.three_streak.progress = Math.min(stats.bestWinStreak, updated.three_streak.maxProgress);
  }
  if (updated.ten_streak) {
    updated.ten_streak.progress = Math.min(stats.bestWinStreak, updated.ten_streak.maxProgress);
  }
  if (updated.first_checkmate) {
    updated.first_checkmate.progress = Math.min(stats.checkmatesDealt, updated.first_checkmate.maxProgress);
  }
  if (updated.fifty_checkmates) {
    updated.fifty_checkmates.progress = Math.min(stats.checkmatesDealt, updated.fifty_checkmates.maxProgress);
  }
  if (updated.flawless_victory) {
    updated.flawless_victory.progress = Math.min(stats.winsWithoutLosses, updated.flawless_victory.maxProgress);
  }
  if (updated.seven_days) {
    updated.seven_days.progress = Math.min(stats.dailyLoginStreak, updated.seven_days.maxProgress);
  }

  // Проверяем разблокировку
  for (const [key, achievement] of Object.entries(updated)) {
    if (!achievement.unlocked && achievement.progress >= achievement.maxProgress) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date().toISOString();
      newUnlocked.push(key);
    }
  }

  return { achievements: updated, newUnlocked };
}

/**
 * Получить цвет по редкости
 */
export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return '#9CA3AF';
    case 'rare': return '#3B82F6';
    case 'epic': return '#8B5CF6';
    case 'legendary': return '#F59E0B';
    default: return '#9CA3AF';
  }
}

/**
 * Получить название редкости
 */
export function getRarityName(rarity: string): string {
  switch (rarity) {
    case 'common': return "Common";
    case 'rare': return "Rare";
    case 'epic': return "Epic";
    case 'legendary': return "Legendary";
    default: return "Common";
  }
}

export default {
  ACHIEVEMENTS_TEMPLATE,
  initAchievements,
  updateAchievementsProgress,
  getRarityColor,
  getRarityName,
};
