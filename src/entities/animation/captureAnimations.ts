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
    name: "Catapult",
    description: "The piece launches from a catapult",
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
    name: "Toy cannon",
    description: "Poof! The piece flies away",
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
    name: "Spring",
    description: "The piece bounces on a spring",
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
    name: "Ambulance",
    description: "An ambulance takes the piece away",
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
    name: "Trapdoor",
    description: "The piece falls through a trapdoor",
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
    name: "Rocket",
    description: "The piece flies off on a rocket",
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
    name: "Fan",
    description: "A powerful fan blows the piece away",
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
    name: "Banana peel",
    description: "The piece slips on a banana",
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
    name: "Balloons",
    description: "Balloons carry the piece into the sky",
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
    name: "Teleport",
    description: "The piece teleports off the board",
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
    name: "Spider web",
    description: "A spider comes down and takes the piece",
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
    name: "Broom",
    description: "A broom sweeps the piece off the board",
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
