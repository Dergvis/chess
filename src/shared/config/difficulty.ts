import type { DifficultyPreset, DifficultyLevel } from '../types';

/**
 * Конфигурация уровней сложности
 * 10 уровней - от новичка до гроссмейстера
 * 
 * Прогрессия:
 * - depth: глубина просчёта ходов (чем больше, тем лучше)
 * - randomFactor: вероятность случайности в выборе хода (уменьшается с уровнем)
 * - moveDelay: время на обдумывание в мс (растёт до уровня 7, потом падает)
 * - blunderProbability: вероятность грубой ошибки (уменьшается)
 * - positionalKnowledge: понимание позиции (растёт)
 * - tacticalAwareness: тактическое зрение (растёт)
 */
export const difficultyPresets: DifficultyPreset[] = [
  {
    id: 'level_1',
    displayName: "Level 1",
    subtitle: "Newcomer",
    description: "Almost random moves. A starting point for newcomers.",
    icon: '👶',
    engineParams: {
      depth: 1,
      randomFactor: 0.9,
      moveDelay: 300,
      blunderProbability: 0.5,
      positionalKnowledge: 0.1,
      tacticalAwareness: 0.05,
    },
    hintEnabled: true,
    uiAssistEnabled: true,
    elo: 100,
  },
  {
    id: 'level_2',
    displayName: "Level 2",
    subtitle: "Beginner",
    description: "Makes simple moves and frequent mistakes.",
    icon: '🧒',
    engineParams: {
      depth: 1,
      randomFactor: 0.7,
      moveDelay: 400,
      blunderProbability: 0.4,
      positionalKnowledge: 0.2,
      tacticalAwareness: 0.1,
    },
    hintEnabled: true,
    uiAssistEnabled: true,
    elo: 200,
  },
  {
    id: 'level_3',
    displayName: "Level 3",
    subtitle: "Learner",
    description: "Understands the rules and is still learning.",
    icon: '📚',
    engineParams: {
      depth: 2,
      randomFactor: 0.5,
      moveDelay: 500,
      blunderProbability: 0.3,
      positionalKnowledge: 0.3,
      tacticalAwareness: 0.15,
    },
    hintEnabled: true,
    uiAssistEnabled: true,
    elo: 350,
  },
  {
    id: 'level_4',
    displayName: "Level 4",
    subtitle: "Casual player",
    description: "Knows the basics and spots simple tactics.",
    icon: '♟️',
    engineParams: {
      depth: 2,
      randomFactor: 0.35,
      moveDelay: 600,
      blunderProbability: 0.2,
      positionalKnowledge: 0.4,
      tacticalAwareness: 0.25,
    },
    hintEnabled: true,
    uiAssistEnabled: true,
    elo: 500,
  },
  {
    id: 'level_5',
    displayName: "Level 5",
    subtitle: "Club player",
    description: "A stronger practice opponent.",
    icon: '🏆',
    engineParams: {
      depth: 3,
      randomFactor: 0.25,
      moveDelay: 700,
      blunderProbability: 0.12,
      positionalKnowledge: 0.5,
      tacticalAwareness: 0.35,
    },
    hintEnabled: true,
    uiAssistEnabled: false,
    elo: 700,
  },
  {
    id: 'level_6',
    displayName: "Level 6",
    subtitle: "Experienced",
    description: "A serious, experienced opponent.",
    icon: '🎯',
    engineParams: {
      depth: 3,
      randomFactor: 0.18,
      moveDelay: 800,
      blunderProbability: 0.08,
      positionalKnowledge: 0.6,
      tacticalAwareness: 0.45,
    },
    hintEnabled: false,
    uiAssistEnabled: false,
    elo: 900,
  },
  {
    id: 'level_7',
    displayName: "Level 7",
    subtitle: "Master",
    description: "A strong player.",
    icon: '⭐',
    engineParams: {
      depth: 4,
      randomFactor: 0.12,
      moveDelay: 1000,
      blunderProbability: 0.05,
      positionalKnowledge: 0.7,
      tacticalAwareness: 0.55,
    },
    hintEnabled: false,
    uiAssistEnabled: false,
    elo: 1200,
  },
  {
    id: 'level_8',
    displayName: "Level 8",
    subtitle: "Expert",
    description: "A challenge for experienced players.",
    icon: '🔥',
    engineParams: {
      depth: 5,
      randomFactor: 0.08,
      moveDelay: 1200,
      blunderProbability: 0.03,
      positionalKnowledge: 0.8,
      tacticalAwareness: 0.65,
    },
    hintEnabled: false,
    uiAssistEnabled: false,
    elo: 1500,
  },
  {
    id: 'level_9',
    displayName: "Level 9",
    subtitle: "Grandmaster",
    description: "A very strong opponent.",
    icon: '👑',
    engineParams: {
      depth: 6,
      randomFactor: 0.04,
      moveDelay: 1500,
      blunderProbability: 0.01,
      positionalKnowledge: 0.9,
      tacticalAwareness: 0.8,
    },
    hintEnabled: false,
    uiAssistEnabled: false,
    elo: 2000,
  },
  {
    id: 'level_10',
    displayName: "Level 10",
    subtitle: "Legend",
    description: "Maximum difficulty.",
    icon: '👹',
    engineParams: {
      depth: 7,
      randomFactor: 0.02,
      moveDelay: 2000,
      blunderProbability: 0.005,
      positionalKnowledge: 0.95,
      tacticalAwareness: 0.9,
    },
    hintEnabled: false,
    uiAssistEnabled: false,
    elo: 2500,
  },
];

/**
 * Получить пресет сложности по ID
 */
export function getDifficultyPreset(id: DifficultyLevel): DifficultyPreset | undefined {
  return difficultyPresets.find(p => p.id === id);
}

/**
 * Получить пресет по номеру уровня (1-10)
 */
export function getDifficultyByLevel(level: number): DifficultyPreset | undefined {
  if (level < 1 || level > 10) return undefined;
  return difficultyPresets.find(p => p.id === `level_${level}`);
}

/**
 * Получить все пресеты
 */
export function getAllDifficultyPresets(): DifficultyPreset[] {
  return [...difficultyPresets];
}

/**
 * Получить прогресс сложности (0-1)
 */
export function getDifficultyProgress(level: number): number {
  return Math.max(0, Math.min(1, (level - 1) / 9));
}

/**
 * Получить следующую сложность
 */
export function getNextDifficulty(currentId: string): DifficultyPreset | undefined {
  const currentIndex = difficultyPresets.findIndex(p => p.id === currentId);
  if (currentIndex < 0 || currentIndex >= difficultyPresets.length - 1) return undefined;
  return difficultyPresets[currentIndex + 1];
}

/**
 * Получить предыдущую сложность
 */
export function getPreviousDifficulty(currentId: string): DifficultyPreset | undefined {
  const currentIndex = difficultyPresets.findIndex(p => p.id === currentId);
  if (currentIndex <= 0) return undefined;
  return difficultyPresets[currentIndex - 1];
}

export default difficultyPresets;
