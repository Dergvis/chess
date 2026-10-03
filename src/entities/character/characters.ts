import type { Character, DifficultyLevel } from '../../shared/types';

/**
 * Конфигурация персонажей-соперников
 * Все персонажи описываются декларативно
 */

const baseReactions: CharacterReactions = {
  gameStart: [
    "Hi! Let’s play!",
    "Ready for a game?",
    "Let’s begin!",
  ],
  goodMove: [
    "Great move!",
    "Clever!",
    "Good thinking!",
  ],
  losePiece: [
    "Oh, my piece!",
    "Unlucky...",
    "I can still come back!",
  ],
  check: [
    "Check! Be careful!",
    "Watch out, check!",
    "Aha, check!",
  ],
  checkmate: [
    "Checkmate! Game over!",
    "That’s checkmate!",
    "The game is over!",
  ],
  win: [
    "Hooray! I won!",
    "Victory!",
    "Great game!",
  ],
  lose: [
    "You won! Well played!",
    "Good game!",
    "Congratulations on your win!",
  ],
};

interface CharacterReactions {
  gameStart: string[];
  goodMove: string[];
  losePiece: string[];
  check: string[];
  checkmate: string[];
  win: string[];
  lose: string[];
}

export const characters: Character[] = [
  {
    id: 'bear',
    name: "Pawnie",
    avatar: '/иконки/Peshka.png',
    theme: 'forest',
    difficultyPreset: 'level_2',
    description: "A friendly beginner learning to play chess",
    reactions: {
      ...baseReactions,
      gameStart: ["Hi! I’m Pawnie. Let’s play!", "Chess! I love it!"],
      lose: ["You beat me! I’ll be back!", "Well played! I’m learning!"],
    },
    soundPack: 'friendly',
    preferredAnimationFlavor: 'cartoon',
  },
  {
    id: 'fox',
    name: "Sergeant Rook",
    avatar: '/иконки/Horse.png',
    theme: 'forest',
    difficultyPreset: 'level_3',
    description: "A battle strategist who likes setting traps",
    reactions: {
      ...baseReactions,
      gameStart: ["Hello there! Shall we play?", "I love chess!"],
      goodMove: ["Clever! I like it!", "Wow, nice!"],
      lose: ["You outsmarted me! Bravo!", "All right, you won!"],
    },
    soundPack: 'playful',
    preferredAnimationFlavor: 'playful',
  },
  {
    id: 'owl',
    name: "Captain Knight",
    avatar: '/иконки/Ladia.png',
    theme: 'night',
    difficultyPreset: 'level_5',
    description: "An experienced captain who plays calmly and thoughtfully",
    reactions: {
      ...baseReactions,
      gameStart: ["Greetings! Ready for a thoughtful game?", "Chess rewards good thinking!"],
      goodMove: ["A wise choice!", "Respect!"],
      check: ["Check! Think carefully!", "Look closely!"],
      lose: ["You found the wiser plan this time!", "A well-earned victory!"],
    },
    soundPack: 'wise',
    preferredAnimationFlavor: 'calm',
  },
  {
    id: 'lion',
    name: "Queen Magister",
    avatar: '/иконки/Queen.png',
    theme: 'safari',
    difficultyPreset: 'level_9',
    description: "A powerful magister who plays like a champion",
    reactions: {
      ...baseReactions,
      gameStart: ["Grr! Hello, champion!", "Ready for a strong game?"],
      goodMove: ["Strong move!", "Powerful!"],
      check: ["Check! Defend yourself!", "I’m attacking!"],
      win: ["Grr! Victory is mine!", "I’m the champion!"],
      lose: ["You were stronger today! Well played!", "Good game, friend!"],
    },
    soundPack: 'strong',
    preferredAnimationFlavor: 'epic',
  },
  {
    id: 'dragon',
    name: "King Nexus",
    avatar: '/иконки/King.png',
    theme: 'fantasy',
    difficultyPreset: 'level_10',
    description: "A great king with big ambitions",
    reactions: {
      ...baseReactions,
      gameStart: ["Hello! Let’s battle!", "This will be fiery!"],
      goodMove: ["Things are heating up!", "Strong!"],
      check: ["Check! Grr!", "Dragon attack!"],
      win: ["Victory! A fiery champion!", "Hooray!"],
      lose: ["You beat the king! Amazing!", "I’ll be stronger next time!"],
    },
    soundPack: 'fantasy',
    preferredAnimationFlavor: 'magical',
  },
];

/**
 * Получить персонажа по ID
 */
export function getCharacter(id: string): Character | undefined {
  return characters.find(c => c.id === id);
}

/**
 * Получить всех персонажей
 */
export function getAllCharacters(): Character[] {
  return [...characters];
}

/**
 * Получить персонажей для выбора по сложности
 */
export function getCharactersByDifficulty(difficulty: DifficultyLevel): Character[] {
  return characters.filter(c => c.difficultyPreset === difficulty);
}

export default characters;
