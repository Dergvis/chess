/**
 * Герои игрока — Рыцарь, Маг, Изобретатель
 */

import type { PlayerHero, HeroEvolutionStage, HeroEmotion } from '../../shared/types/progress';

export const playerHeroes: Record<string, PlayerHero> = {
  knight: {
    id: 'knight',
    name: "Officer Cannon",
    description: "Even the moon is in my sights!",
    avatar: '/personas/Oficerbazuka.png',
    video: '/personas/oficerpushkavideo.mp4',
    color: '#3B82F6',       // синий
    secondaryColor: '#F59E0B', // золотой
    emotion: 'idle',
    evolutionStage: 'base',
  },
  mage: {
    id: 'mage',
    name: "Ladiator",
    description: "I charge up from storm clouds!",
    avatar: '/personas/Ladiator.png',
    video: '/personas/Ladiator.mp4',
    color: '#8B5CF6',       // фиолетовый
    secondaryColor: '#A78BFA',
    emotion: 'idle',
    evolutionStage: 'base',
  },
  inventor: {
    id: 'inventor',
    name: "Laserhorse",
    description: "I can blow the roof off!",
    avatar: '/personas/Laserhorse.png',
    video: '/personas/laserhorsevideo.mp4',
    color: '#10B981',       // зелёный
    secondaryColor: '#F59E0B',
    emotion: 'idle',
    evolutionStage: 'base',
  },
};

/**
 * Получить героя по ID
 */
export function getPlayerHero(id: string): PlayerHero | undefined {
  return playerHeroes[id];
}

/**
 * Получить всех героев
 */
export function getAllPlayerHeroes(): PlayerHero[] {
  return Object.values(playerHeroes);
}

/**
 * Получить стадию эволюции по уровню
 */
export function getEvolutionStage(level: number): HeroEvolutionStage {
  if (level >= 20) return 'legendary';
  if (level >= 15) return 'pet';
  if (level >= 10) return 'glowing';
  if (level >= 5) return 'armored';
  return 'base';
}

/**
 * Получить эмодзи эволюции
 */
export function getEvolutionEmoji(stage: HeroEvolutionStage): string {
  switch (stage) {
    case 'base': return '🛡️';
    case 'armored': return '⚔️';
    case 'glowing': return '✨';
    case 'pet': return '🐾';
    case 'legendary': return '👑';
  }
}

/**
 * Получить описание эволюции
 */
export function getEvolutionDescription(stage: HeroEvolutionStage): string {
  switch (stage) {
    case 'base': return "Basic form";
    case 'armored': return "New armour";
    case 'glowing': return "Glow and aura";
    case 'pet': return "A companion appeared!";
    case 'legendary': return "Legendary form!";
  }
}

/**
 * Получить эмоцию героя для события
 */
export function getHeroEmotionForEvent(
  event: 'win' | 'lose' | 'draw' | 'winStreak' | 'checkmate'
): HeroEmotion {
  switch (event) {
    case 'win': return 'happy';
    case 'lose': return 'sad';
    case 'draw': return 'determined';
    case 'winStreak': return 'excited';
    case 'checkmate': return 'celebrating';
  }
}

/**
 * Получить фразу героя для события
 */
export function getHeroPhrase(
  heroId: string,
  event: 'idle' | 'win' | 'lose' | 'draw' | 'winStreak' | 'checkmate'
): string {
  const phrases: Record<string, Record<string, string[]>> = {
    knight: {
      idle: ["Hi! Let’s play!", "Ready for battle?", "For honour and glory!"],
      win: ["Victory! Honour and glory!", "We won!", "A strong strike!"],
      lose: ["We’ll win next time!", "I’ll be back!", "That was a worthy opponent!"],
      draw: ["A draw... I’m not giving up!", "An even game!"],
      winStreak: ["I’m unstoppable! 🔥", "A winning streak! Powerful!", "Nothing can stop me!"],
      checkmate: ["Checkmate! A chess strike! ⚔️", "Royal checkmate!", "Victory is mine!"],
    },
    mage: {
      idle: ["Hello! Magic awaits!", "Ready to plan?", "Wisdom is my strength!"],
      win: ["Magic won! ✨", "The plan worked!", "Thinking wins!"],
      lose: ["I need a better plan...", "I’ll return with a new plan!", "Wisdom comes with practice."],
      draw: ["Evenly matched... An interesting game."],
      winStreak: ["My magic is unstoppable! 🔮", "A victory spell!", "Every move calculated!"],
      checkmate: ["Magical checkmate! 🌟", "The runes showed the way!", "Chess magic!"],
    },
    inventor: {
      idle: ["Hello! The machines are ready!", "Ready to invent?", "Let’s create something!"],
      win: ["The invention worked! 🔧", "Brilliant!", "The victory machine is running!"],
      lose: ["The machine needs some work...", "Not every gear is in place yet.", "I can fix this!"],
      draw: ["Even mechanics! More tests needed."],
      winStreak: ["My machine is unstoppable! ⚡", "Engineering wins!", "A streak! My gadgets work!"],
      checkmate: ["Checkmate! An engineer’s approach! 🛠️", "Mechanical checkmate!", "Invention of the century!"],
    },
  };

  const heroPhrases = phrases[heroId] || phrases.knight;
  const options = heroPhrases[event] || ["Good game!"];
  return options[Math.floor(Math.random() * options.length)];
}

export default playerHeroes;
