import type { UserSettings, DifficultyLevel, AnimationIntensity } from '../types';

/**
 * Storage Layer - локальное хранение настроек
 * Для MVP используется localStorage
 */

const STORAGE_KEY = 'chess_gosha_settings';

const defaultSettings: UserSettings = {
  pieceSkinId: 'block',
  opponentId: 'bear',
  difficulty: 'level_1',
  animationIntensity: 'full',
  soundEnabled: true,
  musicEnabled: true,
  voiceEnabled: true,
  onboardingCompleted: false,
  playerName: '',
  playerExperience: 'beginner',
};

/**
 * Получить настройки из localStorage
 */
export function getSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return defaultSettings;
}

/**
 * Сохранить настройки в localStorage
 */
export function saveSettings(settings: Partial<UserSettings>): void {
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

/**
 * Обновить отдельное поле настроек
 */
export function updateSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): void;
export function updateSetting(settings: Partial<UserSettings>): void;
export function updateSetting<K extends keyof UserSettings>(
  key: K | Partial<UserSettings>,
  value?: UserSettings[K]
): void {
  if (typeof key === 'object') {
    saveSettings(key);
  } else {
    saveSettings({ [key]: value! });
  }
}

/**
 * Сбросить настройки к значениям по умолчанию
 */
export function resetSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error resetting settings:', error);
  }
}

/**
 * Проверить, завершён ли onboarding
 */
export function isOnboardingCompleted(): boolean {
  const settings = getSettings();
  return settings.onboardingCompleted;
}

/**
 * Отметить onboarding как завершённый
 */
export function completeOnboarding(): void {
  updateSetting('onboardingCompleted', true);
}

/**
 * Получить имя игрока
 */
export function getPlayerName(): string {
  const settings = getSettings();
  return settings.playerName || 'Игрок';
}

/**
 * Установить имя игрока
 */
export function setPlayerName(name: string): void {
  updateSetting('playerName', name);
}

/**
 * Получить последний выбранный скин фигур
 */
export function getLastPieceSkin(): string {
  const settings = getSettings();
  return settings.pieceSkinId;
}

/**
 * Получить последний уровень сложности
 */
export function getLastDifficulty(): DifficultyLevel {
  const settings = getSettings();
  return settings.difficulty;
}

/**
 * Получить последнего выбранного соперника
 */
export function getLastOpponent(): string {
  const settings = getSettings();
  return settings.opponentId;
}

/**
 * Получить интенсивность анимаций
 */
export function getAnimationIntensity(): AnimationIntensity {
  const settings = getSettings();
  return settings.animationIntensity;
}

export default {
  getSettings,
  saveSettings,
  updateSetting,
  resetSettings,
  isOnboardingCompleted,
  completeOnboarding,
  getPlayerName,
  setPlayerName,
  getLastPieceSkin,
  getLastDifficulty,
  getLastOpponent,
  getAnimationIntensity,
};
