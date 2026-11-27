/**
 * Система ежедневных заданий
 */

import type { DailyMission, DailyMissionsState } from '../../shared/types/progress';

// Пул заданий
const MISSION_POOL: Omit<DailyMission, 'progress' | 'completed' | 'claimed'>[] = [
  {
    id: 'play_2_games',
    title: "Player",
    description: "Play 2 games",
    icon: '🎮',
    maxProgress: 2,
    xpReward: 75,
    crystalReward: 10,
  },
  {
    id: 'deliver_checkmate',
    title: "Chess player",
    description: "Give checkmate",
    icon: '♟️',
    maxProgress: 1,
    xpReward: 75,
    crystalReward: 15,
  },
  {
    id: 'win_with_knight',
    title: "A knight’s move",
    description: "Win while capturing a piece with a knight",
    icon: '🐴',
    maxProgress: 1,
    xpReward: 75,
    crystalReward: 10,
  },
  {
    id: 'make_castling',
    title: "Fortress",
    description: "Castle your king",
    icon: '🏰',
    maxProgress: 1,
    xpReward: 50,
    crystalReward: 10,
  },
  {
    id: 'win_1_game',
    title: "Winner",
    description: "Win 1 game",
    icon: '🏆',
    maxProgress: 1,
    xpReward: 50,
    crystalReward: 5,
  },
  {
    id: 'play_3_games',
    title: "Marathon player",
    description: "Play 3 games",
    icon: '🏃',
    maxProgress: 3,
    xpReward: 100,
    crystalReward: 15,
  },
  {
    id: 'capture_bishop',
    title: "Hunter",
    description: "Capture an enemy bishop",
    icon: '🎯',
    maxProgress: 1,
    xpReward: 50,
    crystalReward: 10,
  },
  {
    id: 'eat_queen',
    title: "Queen hunter",
    description: "Capture the enemy queen",
    icon: '👸',
    maxProgress: 1,
    xpReward: 75,
    crystalReward: 15,
  },
];

/**
 * Сгенерировать 3 ежедневных задания
 */
export function generateDailyMissions(): DailyMission[] {
  const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  return selected.map(m => ({
    ...m,
    progress: 0,
    completed: false,
    claimed: false,
  }));
}

/**
 * Получить или создать ежедневные задания
 */
export function getDailyMissions(): DailyMissionsState {
  const stored = localStorage.getItem('chezzies_daily_missions');
  const today = new Date().toISOString().split('T')[0];

  if (stored) {
    const parsed: DailyMissionsState = JSON.parse(stored);
    // Если задания от сегодняшнего дня — возвращаем
    if (parsed.date === today) {
      return parsed;
    }
  }

  // Генерируем новые задания
  const missions = generateDailyMissions();
  const state: DailyMissionsState = { date: today, missions };
  localStorage.setItem('chezzies_daily_missions', JSON.stringify(state));
  return state;
}

/**
 * Обновить прогресс заданий
 */
export function updateMissionProgress(
  missionId: string,
  increment: number = 1
): DailyMissionsState {
  const state = getDailyMissions();
  const updated = { ...state, missions: state.missions.map((m: DailyMission) => ({ ...m })) };

  for (const mission of updated.missions) {
    if (mission.id === missionId && !mission.completed) {
      mission.progress = Math.min(mission.progress + increment, mission.maxProgress);
      if (mission.progress >= mission.maxProgress) {
        mission.completed = true;
      }
    }
  }

  localStorage.setItem('chezzies_daily_missions', JSON.stringify(updated));
  return updated;
}

/**
 * Забрать награду за задание
 */
export function claimMissionReward(missionId: string): { xp: number; crystals: number } | null {
  const state = getDailyMissions();
  const mission = state.missions.find((m: DailyMission) => m.id === missionId);

  if (!mission || !mission.completed || mission.claimed) {
    return null;
  }

  // Отмечаем как забранное
  const updated = {
    ...state,
    missions: state.missions.map((m: DailyMission) =>
      m.id === missionId ? { ...m, claimed: true } : m
    ),
  };
  localStorage.setItem('chezzies_daily_missions', JSON.stringify(updated));

  return { xp: mission.xpReward, crystals: mission.crystalReward };
}

/**
 * Проверить, все ли задания выполнены
 */
export function areAllMissionsCompleted(): boolean {
  const state = getDailyMissions();
  return state.missions.every((m: DailyMission) => m.completed);
}

/**
 * Получить количество выполненных заданий
 */
export function getCompletedMissionsCount(): number {
  const state = getDailyMissions();
  return state.missions.filter((m: DailyMission) => m.completed).length;
}

export default {
  generateDailyMissions,
  getDailyMissions,
  updateMissionProgress,
  claimMissionReward,
  areAllMissionsCompleted,
  getCompletedMissionsCount,
};
