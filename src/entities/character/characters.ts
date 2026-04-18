import type { Character, DifficultyLevel } from '../../shared/types';

/**
 * Конфигурация персонажей-соперников
 * Все персонажи описываются декларативно
 */

const baseReactions: CharacterReactions = {
  gameStart: [
    'Привет! Давай сыграем!',
    'Готов к партии?',
    'Начинаем игру!',
  ],
  goodMove: [
    'Отличный ход!',
    'Умно!',
    'Хорошо придумано!',
  ],
  losePiece: [
    'Ой, моя фигура!',
    'Не повезло...',
    'Ничего, ещё отыграюсь!',
  ],
  check: [
    'Шах! Будь осторожен!',
    'Внимание, шах!',
    'Опа, шах!',
  ],
  checkmate: [
    'Мат! Партия окончена!',
    'Всё, мат!',
    'Игра закончена!',
  ],
  win: [
    'Ура! Я победил!',
    'Победа!',
    'Отличная партия!',
  ],
  lose: [
    'Ты победил! Молодец!',
    'Хорошая игра!',
    'Поздравляю с победой!',
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
    name: 'Миша-Шахматист',
    avatar: '🐻',
    theme: 'forest',
    difficultyPreset: 'level_2',
    description: 'Дружелюбный медвежонок, который только учится играть в шахматы',
    reactions: {
      ...baseReactions,
      gameStart: ['Привет! Я Миша, давай играть!', 'Ух, шахматы! Люблю!'],
      lose: ['Ты сильнее меня! Но я ещё вернусь!', 'Молодец! Я учусь!'],
    },
    soundPack: 'friendly',
    preferredAnimationFlavor: 'cartoon',
  },
  {
    id: 'fox',
    name: 'Лиса-Хитрюга',
    avatar: '🦊',
    theme: 'forest',
    difficultyPreset: 'level_3',
    description: 'Хитрая лисичка, любит ставить ловушки',
    reactions: {
      ...baseReactions,
      gameStart: ['Привет-привет! Поиграем?', 'Я люблю шахматы!'],
      goodMove: ['Хитро! Мне нравится!', 'Ого, неплохо!'],
      lose: ['Ты перехитрил меня! Bravo!', 'Ладно, ты выиграл!'],
    },
    soundPack: 'playful',
    preferredAnimationFlavor: 'playful',
  },
  {
    id: 'owl',
    name: 'Сова-Мудрюга',
    avatar: '🦉',
    theme: 'night',
    difficultyPreset: 'level_5',
    description: 'Мудрая сова, играет обдуманно и спокойно',
    reactions: {
      ...baseReactions,
      gameStart: ['Приветствую! Готов к мудрой игре?', 'Шахматы — игра умных!'],
      goodMove: ['Мудрое решение!', 'Уважение!'],
      check: ['Шах! Подумай хорошо!', 'Внимательнее!'],
      lose: ['Ты оказался мудрее в этой партии!', 'Заслуженная победа!'],
    },
    soundPack: 'wise',
    preferredAnimationFlavor: 'calm',
  },
  {
    id: 'lion',
    name: 'Лев-Чемпион',
    avatar: '🦁',
    theme: 'safari',
    difficultyPreset: 'level_6',
    description: 'Сильный и уверенный лев, играет как чемпион',
    reactions: {
      ...baseReactions,
      gameStart: ['Ррр! Привет, чемпион!', 'Готов к сильной игре?'],
      goodMove: ['Сильный ход!', 'Мощно!'],
      check: ['Шах! Защищайся!', 'Атакую!'],
      win: ['Ррр! Победа за мной!', 'Я чемпион!'],
      lose: ['Ты сильнее сегодня! Респект!', 'Хорошая игра, друг!'],
    },
    soundPack: 'strong',
    preferredAnimationFlavor: 'epic',
  },
  {
    id: 'dragon',
    name: 'Дракоша',
    avatar: '🐉',
    theme: 'fantasy',
    difficultyPreset: 'level_8',
    description: 'Маленький дракон с большими амбициями',
    reactions: {
      ...baseReactions,
      gameStart: ['Пррривет! Давай сразимся!', 'Огонь будет!'],
      goodMove: ['Ого, жарко!', 'Сильно!'],
      check: ['Шах! Гррр!', 'Атака дракона!'],
      win: ['Победа! Я огненный чемпион!', 'Ура!'],
      lose: ['Ты победил дракона! Круто!', 'В следующий раз я буду сильнее!'],
    },
    soundPack: 'fantasy',
    preferredAnimationFlavor: 'magical',
  },
  {
    id: 'robot',
    name: 'Робот-Считайка',
    avatar: '🤖',
    theme: 'space',
    difficultyPreset: 'level_10',
    description: 'Умный робот, просчитывает ходы наперёд',
    reactions: {
      ...baseReactions,
      gameStart: ['Привет! Готов к логической игре?', 'Запускаю шахматный модуль...'],
      goodMove: ['Логично! +10 очков!', 'Вычисления подтверждают: хороший ход!'],
      check: ['Внимание! Шах! Требуется защита!', 'Угроза обнаружена!'],
      win: ['Победа! Мои алгоритмы сработали!', 'Логика победила!'],
      lose: ['Ты превзошёл мои алгоритмы! Поздравляю!', 'Интересная партия!'],
    },
    soundPack: 'electronic',
    preferredAnimationFlavor: 'tech',
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
