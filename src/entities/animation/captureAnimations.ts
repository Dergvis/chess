import type { AnimationType } from '../../shared/types';

/**
 * Конфигурация комедийных анимаций взятия
 * Безопасные, мультяшные, без насилия
 */

export interface CaptureAnimation {
  id: string;
  name: string;
  description: string;
  eventType: AnimationType;
  duration: {
    full: number;
    short: number;
    minimal: number;
  };
  skippable: boolean;
  flavor: 'cartoon' | 'playful' | 'magical' | 'tech';
}

export const captureAnimations: CaptureAnimation[] = [
  {
    id: 'catapult',
    name: 'Катапульта',
    description: 'Фигура запускается из катапульты',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1500,
      short: 800,
      minimal: 300,
    },
    skippable: true,
    flavor: 'cartoon',
  },
  {
    id: 'cannon',
    name: 'Игрушечная пушка',
    description: 'Пуф! И фигура улетает',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1200,
      short: 600,
      minimal: 250,
    },
    skippable: true,
    flavor: 'playful',
  },
  {
    id: 'spring',
    name: 'Пружина',
    description: 'Фигура подпрыгивает на пружине',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1000,
      short: 500,
      minimal: 200,
    },
    skippable: true,
    flavor: 'cartoon',
  },
  {
    id: 'ambulance',
    name: 'Скорая помощь',
    description: 'Приезжает скорая и увозит фигуру',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1800,
      short: 900,
      minimal: 350,
    },
    skippable: true,
    flavor: 'cartoon',
  },
  {
    id: 'trapdoor',
    name: 'Люк',
    description: 'Фигура проваливается в люк',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1000,
      short: 500,
      minimal: 200,
    },
    skippable: true,
    flavor: 'playful',
  },
  {
    id: 'rocket',
    name: 'Ракета',
    description: 'Фигура улетает на ракете',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1600,
      short: 800,
      minimal: 320,
    },
    skippable: true,
    flavor: 'tech',
  },
  {
    id: 'fan',
    name: 'Вентилятор',
    description: 'Мощный вентилятор сдувает фигуру',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1200,
      short: 600,
      minimal: 250,
    },
    skippable: true,
    flavor: 'playful',
  },
  {
    id: 'banana',
    name: 'Банановая кожура',
    description: 'Фигура поскользнулась на банане',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1300,
      short: 650,
      minimal: 280,
    },
    skippable: true,
    flavor: 'cartoon',
  },
  {
    id: 'balloons',
    name: 'Воздушные шарики',
    description: 'Шарики уносят фигуру в небо',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1600,
      short: 800,
      minimal: 320,
    },
    skippable: true,
    flavor: 'magical',
  },
  {
    id: 'teleport',
    name: 'Телепорт',
    description: 'Фигура телепортируется с доски',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1000,
      short: 500,
      minimal: 200,
    },
    skippable: true,
    flavor: 'tech',
  },
  {
    id: 'spider',
    name: 'Паутинка',
    description: 'Паучок спускается и забирает фигуру',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1400,
      short: 700,
      minimal: 300,
    },
    skippable: true,
    flavor: 'playful',
  },
  {
    id: 'broom',
    name: 'Метла',
    description: 'Метла подметает фигуру с доски',
    eventType: 'MOVE_CAPTURE',
    duration: {
      full: 1300,
      short: 650,
      minimal: 280,
    },
    skippable: true,
    flavor: 'cartoon',
  },
];

/**
 * Получить случайную анимацию взятия
 */
export function getRandomCaptureAnimation(flavor?: string): CaptureAnimation {
  const filtered = flavor 
    ? captureAnimations.filter(a => a.flavor === flavor)
    : captureAnimations;
  
  const animations = filtered.length > 0 ? filtered : captureAnimations;
  const index = Math.floor(Math.random() * animations.length);
  return animations[index];
}

/**
 * Получить анимацию по ID
 */
export function getCaptureAnimation(id: string): CaptureAnimation | undefined {
  return captureAnimations.find(a => a.id === id);
}

/**
 * Получить все анимации взятия
 */
export function getAllCaptureAnimations(): CaptureAnimation[] {
  return [...captureAnimations];
}

export default captureAnimations;
