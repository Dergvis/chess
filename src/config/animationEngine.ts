import animationsData from './animations.json';
import eventMappingData from './eventMapping.json';
import reactionsData from './reactions.json';
import opponentsData from './opponents.json';
import type {
  AnimationSequence,
  ReactionSequence,
  EventMappingConfig,
  OpponentConfig,
  AnimationFlavor,
  AnimationIntensity,
  EventType,
  AnimationAction,
} from './types';

/**
 * Движок воспроизведения анимаций на основе конфигурации
 * Sequence-based animation engine
 */
class AnimationEngine {
  private animations: Map<string, AnimationSequence> = new Map();
  private reactions: Map<string, ReactionSequence> = new Map();
  private eventMapping: Map<string, EventMappingConfig> = new Map();
  private opponents: Map<string, OpponentConfig> = new Map();
  private currentIntensity: AnimationIntensity = 'full';
  private soundEnabled: boolean = true;

  constructor() {
    this.loadConfigurations();
  }

  /**
   * Загрузка всех конфигураций
   */
  private loadConfigurations(): void {
    // Загрузка анимаций
    (animationsData.animations as any[]).forEach((anim) => {
      this.animations.set(anim.id, anim as AnimationSequence);
    });

    // Загрузка реакций
    (reactionsData.reactions as any[]).forEach((reaction) => {
      this.reactions.set(reaction.id, reaction as ReactionSequence);
    });

    // Загрузка маппинга событий
    Object.entries(eventMappingData.eventMapping).forEach(([event, config]) => {
      this.eventMapping.set(event, config as EventMappingConfig);
    });

    // Загрузка оппонентов
    (opponentsData.opponents as any[]).forEach((opponent) => {
      this.opponents.set(opponent.id, opponent as OpponentConfig);
    });

    console.log('🎬 Animation Engine loaded:', {
      animations: this.animations.size,
      reactions: this.reactions.size,
      eventMappings: this.eventMapping.size,
      opponents: this.opponents.size,
    });
  }

  /**
   * Получить анимацию для события
   */
  getAnimationForEvent(eventType: EventType, flavor?: AnimationFlavor): AnimationSequence | null {
    const mapping = this.eventMapping.get(eventType);
    if (!mapping) return null;

    if (eventType === 'MOVE_CAPTURE' && mapping.type === 'pool') {
      // Выбор случайной анимации из пула
      const pool = mapping.pool!;
      const filteredPool = flavor
        ? pool.filter((id: string) => {
            const anim = this.animations.get(id);
            return anim?.flavor === flavor;
          })
        : pool;

      const animationPool = filteredPool.length > 0 ? filteredPool : pool;
      const randomId = animationPool[Math.floor(Math.random() * animationPool.length)];
      return this.animations.get(randomId) || null;
    }

    if (mapping.animation) {
      return this.animations.get(mapping.animation) || null;
    }

    return null;
  }

  /**
   * Получить реакцию для события
   */
  getReactionForEvent(eventType: EventType, opponentId?: string): ReactionSequence | null {
    const mapping = this.eventMapping.get(eventType);
    if (!mapping || mapping.type !== 'reaction') return null;

    // Если есть оппонент, используем его предпочтения
    if (opponentId) {
      const opponent = this.opponents.get(opponentId);
      if (opponent) {
        // Маппинг eventType на reaction key
        const reactionKey = this.getReactionKeyForEvent(eventType);
        const reactionId = opponent.reactions[reactionKey as keyof typeof opponent.reactions];
        if (reactionId) {
          return this.reactions.get(reactionId) || null;
        }
      }
    }

    // Случайная реакция из пула
    const pool = mapping.pool!;
    const randomId = pool[Math.floor(Math.random() * pool.length)];
    return this.reactions.get(randomId) || null;
  }

  /**
   * Получить реакцию по имени ключа оппонента
   */
  private getReactionKeyForEvent(eventType: EventType): string {
    const mapping: Record<EventType, string> = {
      MOVE_BASIC: 'onCapture',
      MOVE_CAPTURE: 'onCapture',
      MOVE_CASTLING: 'onCapture',
      MOVE_PROMOTION: 'onCapture',
      STATE_CHECK: 'onCheck',
      STATE_CHECKMATE: 'onCheckmateLose',
      STATE_STALEMATE: 'onCheckmateLose',
      STATE_WIN: 'onCheckmateWin',
      STATE_LOSE: 'onCheckmateLose',
      STATE_HINT: 'onGameStart',
    };
    return mapping[eventType];
  }

  /**
   * Получить сцену для мата
   */
  getCheckmateScene(): {
    winnerAnimation: ReactionSequence | null;
    loserAnimation: ReactionSequence | null;
    text?: string;
  } {
    const mapping = this.eventMapping.get('STATE_CHECKMATE');
    if (!mapping || mapping.type !== 'scene') {
      return { winnerAnimation: null, loserAnimation: null };
    }

    // Анимация победителя
    let winnerAnimation: ReactionSequence | null = null;
    if (mapping.winner?.animation) {
      winnerAnimation = this.reactions.get(mapping.winner.animation) || null;
    }

    // Анимация проигравшего (случайная из пула)
    let loserAnimation: ReactionSequence | null = null;
    if (mapping.loser?.pool) {
      const pool = mapping.loser.pool;
      const randomId = pool[Math.floor(Math.random() * pool.length)];
      loserAnimation = this.reactions.get(randomId) || null;
    }

    return {
      winnerAnimation,
      loserAnimation,
      text: mapping.text,
    };
  }

  /**
   * Воспроизвести анимацию
   */
  async playAnimation(
    animation: AnimationSequence,
    intensity: AnimationIntensity = 'full',
    callbacks?: {
      onAction?: (action: AnimationAction, index: number) => void;
      onComplete?: () => void;
    }
  ): Promise<void> {
    console.log(`🎬 Playing animation: ${animation.name} (${intensity})`);

    // Воспроизведение последовательности действий
    for (let i = 0; i < animation.sequence.length; i++) {
      const action = animation.sequence[i];
      
      // Вызов колбека для каждого действия
      callbacks?.onAction?.(action, i);

      // Обработка задержек
      if ('delay' in action && action.delay !== undefined) {
        await this.sleep(action.delay * 1000);
      }
      
      if (action.action === 'delay' && 'time' in action) {
        await this.sleep(action.time * 1000);
      }
    }

    // Воспроизведение звука
    if (this.soundEnabled && animation.sound) {
      this.playSound(animation.sound);
    }

    callbacks?.onComplete?.();
  }

  /**
   * Воспроизвести реакцию
   */
  async playReaction(
    reaction: ReactionSequence,
    callbacks?: {
      onAction?: (action: AnimationAction, index: number) => void;
      onComplete?: () => void;
    }
  ): Promise<void> {
    console.log(`😊 Playing reaction: ${reaction.name}`);

    for (let i = 0; i < reaction.sequence.length; i++) {
      const action = reaction.sequence[i];
      callbacks?.onAction?.(action, i);

      if ('delay' in action && action.delay !== undefined) {
        await this.sleep(action.delay * 1000);
      }
    }

    if (this.soundEnabled && reaction.sound) {
      this.playSound(reaction.sound);
    }

    callbacks?.onComplete?.();
  }

  /**
   * Получить звук для события
   */
  getSoundForEvent(eventType: EventType): string | null {
    const mapping = this.eventMapping.get(eventType);
    return mapping?.sound || null;
  }

  /**
   * Воспроизвести звук
   */
  playSound(soundId: string): void {
    if (!this.soundEnabled) return;
    
    // Здесь будет интеграция с soundSystem
    console.log(`🔊 Playing sound: ${soundId}`);
  }

  /**
   * Установить интенсивность анимаций
   */
  setIntensity(intensity: AnimationIntensity): void {
    this.currentIntensity = intensity;
  }

  /**
   * Получить текущую интенсивность
   */
  getIntensity(): AnimationIntensity {
    return this.currentIntensity;
  }

  /**
   * Включить/выключить звуки
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * Получить все анимации взятия
   */
  getAllCaptureAnimations(): AnimationSequence[] {
    const mapping = this.eventMapping.get('MOVE_CAPTURE');
    if (!mapping || !mapping.pool) return [];

    return mapping.pool
      .map((id: string) => this.animations.get(id))
      .filter((anim): anim is AnimationSequence => anim !== undefined);
  }

  /**
   * Получить анимацию по ID
   */
  getAnimationById(id: string): AnimationSequence | undefined {
    return this.animations.get(id);
  }

  /**
   * Получить реакцию по ID
   */
  getReactionById(id: string): ReactionSequence | undefined {
    return this.reactions.get(id);
  }

  /**
   * Получить оппонента по ID
   */
  getOpponentById(id: string): OpponentConfig | undefined {
    return this.opponents.get(id);
  }

  /**
   * Получить всех оппонентов
   */
  getAllOpponents(): OpponentConfig[] {
    return Array.from(this.opponents.values());
  }

  /**
   * Получить предпочтения анимаций для оппонента
   */
  getOpponentAnimationFlavor(opponentId: string): AnimationFlavor | undefined {
    const opponent = this.opponents.get(opponentId);
    return opponent?.preferredAnimationFlavor as AnimationFlavor | undefined;
  }

  /**
   * Helper: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Синглтон
export const animationEngine = new AnimationEngine();

export default animationEngine;
