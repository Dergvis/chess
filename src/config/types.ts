/**
 * Типы для конфигурации анимаций
 */

export type AnimationFlavor = 'cartoon' | 'playful' | 'magical' | 'tech' | 'elegant' | 'dramatic';
export type AnimationIntensity = 'full' | 'short' | 'minimal';
export type AnimationType = 'capture' | 'move' | 'state' | 'reaction';
export type EventType = 
  | 'MOVE_BASIC'
  | 'MOVE_CAPTURE'
  | 'MOVE_CASTLING'
  | 'MOVE_PROMOTION'
  | 'STATE_CHECK'
  | 'STATE_CHECKMATE'
  | 'STATE_STALEMATE'
  | 'STATE_WIN'
  | 'STATE_LOSE'
  | 'STATE_HINT';

// Действия в последовательности анимации
export type AnimationAction =
  | { action: 'spawn_object'; object: string; count?: number; delay?: number }
  | { action: 'despawn'; target: string; delay?: number }
  | { action: 'attach_target'; to: string; delay?: number }
  | { action: 'attach_to_target'; to: string; delay?: number }
  | { action: 'insert'; target: string; delay?: number }
  | { action: 'delay'; time: number }
  | { action: 'launch'; target: string; direction: string }
  | { action: 'launch_up'; height: number; rotation?: number }
  | { action: 'fire'; direction: string }
  | { action: 'play_effect'; effect: string }
  | { action: 'target_step'; target: string; delay?: number }
  | { action: 'slip'; target: string; direction: string }
  | { action: 'slide_out'; direction: string }
  | { action: 'compress'; time: number }
  | { action: 'target_react'; emotion: string; delay?: number }
  | { action: 'drive_in'; from: string; delay?: number }
  | { action: 'load_target'; time?: number }
  | { action: 'drive_out'; to: string; delay?: number }
  | { action: 'ignite'; time: number }
  | { action: 'open_door'; time: number }
  | { action: 'target_fall'; target: string; direction: string }
  | { action: 'close_door'; delay?: number }
  | { action: 'turn_on'; speed: string; delay?: number }
  | { action: 'blow'; target: string; direction: string }
  | { action: 'lift_up'; height: number; time: number }
  | { action: 'pop_balloons'; delay?: number }
  | { action: 'encircle_target'; target: string; delay?: number }
  | { action: 'flash'; intensity: string; delay?: number }
  | { action: 'dematerialize'; target: string }
  | { action: 'descend'; from: string; delay?: number }
  | { action: 'shoot_web'; target: string; delay?: number }
  | { action: 'pull_up'; target: string; height: number }
  | { action: 'sweep_in'; from: string; delay?: number }
  | { action: 'push_target'; target: string; direction: string }
  | { action: 'sweep_out'; to: string; delay?: number }
  // Реакции
  | { action: 'jump'; height?: number; count?: number }
  | { action: 'face'; emotion: string; delay?: number }
  | { action: 'shake'; time?: number; intensity?: string }
  | { action: 'shake_head'; delay?: number }
  | { action: 'land'; delay?: number }
  | { action: 'gesture'; type: string; delay?: number }
  | { action: 'stomp'; delay?: number }
  | { action: 'spawn_object'; object: string; delay?: number }
  | { action: 'tear_fall'; distance: number; delay?: number }
  | { action: 'helmet_fall'; onto: string; delay?: number }
  | { action: 'dizzy'; time: number }
  | { action: 'wave'; hand?: string; object?: string; speed?: string }
  | { action: 'sigh'; delay?: number }
  | { action: 'sit_on'; object: string; delay?: number }
  | { action: 'look_around'; direction: string }
  | { action: 'crown_tilt'; angle: number; delay?: number }
  | { action: 'crown_fall'; delay?: number }
  | { action: 'look_down'; at: string; delay?: number }
  | { action: 'hand_on_chest'; delay?: number }
  | { action: 'fall_backward'; time: number; delay?: number }
  | { action: 'stars_circle'; around: string; delay?: number }
  | { action: 'spin'; direction: string; delay?: number }
  | { action: 'cheer'; arms?: string; delay?: number }
  | { action: 'strike_pose'; delay?: number }
  | { action: 'raise_arms'; delay?: number }
  | { action: 'crown_glow'; intensity: string; delay?: number }
  | { action: 'bow_received'; delay?: number }
  | { action: 'wave_to_crowd'; delay?: number }
  | { action: 'nod'; direction: string; delay?: number }
  | { action: 'crown_shine'; delay?: number }
  | { action: 'shoulder_slump'; delay?: number }
  | { action: 'raise_wand'; delay?: number }
  | { action: 'cast_spell'; color: string; delay?: number }
  | { action: 'sparkles_around'; delay?: number }
  | { action: 'poof_smoke'; delay?: number }
  | { action: 'fade_out'; time: number; delay?: number };

export interface AnimationSequence {
  id: string;
  name: string;
  type: AnimationType;
  flavor: AnimationFlavor;
  duration: {
    full: number;
    short: number;
    minimal: number;
  };
  skippable: boolean;
  sequence: AnimationAction[];
  sound: string;
  description: string;
}

export interface ReactionSequence {
  id: string;
  name: string;
  type: string;
  duration: number;
  sequence: AnimationAction[];
  sound: string;
}

export interface EventMappingConfig {
  animation?: string | null;
  type?: 'pool' | 'reaction' | 'scene';
  pool?: string[];
  random?: boolean;
  sound?: string;
  text?: string;
  winner?: {
    animation: string;
    effects: string[];
  };
  loser?: {
    pool: string[];
    random: boolean;
  };
  both?: {
    animation: string;
  };
  effects?: string[];
}

export interface OpponentPersonality {
  aggression: number;
  emotionsIntensity: number;
  animationStyle: string;
}

export interface OpponentReactions {
  onGameStart: string;
  onCapture: string;
  onLosePiece: string;
  onCheck: string;
  onCheckmateWin: string;
  onCheckmateLose: string;
}

export interface OpponentConfig {
  id: string;
  name: string;
  theme: string;
  avatar: string;
  description: string;
  difficultyPreset: string;
  personality: OpponentPersonality;
  reactions: OpponentReactions;
  soundPack: string;
  voiceStyle: string;
  preferredAnimationFlavor: string;
}

export interface DifficultyPreset {
  id: string;
  engineDepth: number;
  blunderChance: number;
  maxThinkTimeMs: number;
  assistLevel: string;
  showThreats: boolean;
}
