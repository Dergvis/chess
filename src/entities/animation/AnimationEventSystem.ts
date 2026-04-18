import type { AnimationEvent, AnimationType, AnimationIntensity } from '../../shared/types';

/**
 * Animation Event System - система управления анимациями
 * Работает через очередь событий
 */

export interface AnimationHandler {
  (event: AnimationEvent): Promise<void>;
}

export class AnimationEventSystem {
  private queue: AnimationEvent[] = [];
  private isProcessing = false;
  private handlers: Map<AnimationType, AnimationHandler[]> = new Map();
  private intensity: AnimationIntensity = 'full';
  private onCompleteCallbacks: (() => void)[] = [];

  constructor() {
    this.initDefaultHandlers();
  }

  /**
   * Установить интенсивность анимаций
   */
  setIntensity(intensity: AnimationIntensity): void {
    this.intensity = intensity;
  }

  /**
   * Получить текущую интенсивность
   */
  getIntensity(): AnimationIntensity {
    return this.intensity;
  }

  /**
   * Добавить обработчик для типа события
   */
  on(type: AnimationType, handler: AnimationHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /**
   * Удалить обработчик
   */
  off(type: AnimationType, handler: AnimationHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Добавить событие в очередь
   */
  emit(event: Omit<AnimationEvent, 'priority'>): void {
    const priority = this.getEventPriority(event.type);
    const animationEvent: AnimationEvent = {
      ...event,
      priority,
      skippable: event.skippable ?? true,
    };

    // Вставляем в очередь согласно приоритету
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < priority) {
        insertIndex = i;
        break;
      }
    }
    this.queue.splice(insertIndex, 0, animationEvent);

    // Запускаем обработку, если не идёт сейчас
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Получить приоритет события
   */
  private getEventPriority(type: AnimationType): number {
    const priorities: Record<AnimationType, number> = {
      MOVE_BASIC: 1,
      MOVE_CASTLING: 2,
      MOVE_PROMOTION: 3,
      MOVE_CAPTURE: 4,
      STATE_CHECK: 5,
      STATE_HINT: 1,
      STATE_STALEMATE: 6,
      STATE_CHECKMATE: 7,
      STATE_WIN: 8,
      STATE_LOSE: 9,
    };
    return priorities[type] || 0;
  }

  /**
   * Обработать очередь
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      await this.processEvent(event);
    }

    this.isProcessing = false;

    // Вызываем onComplete callbacks
    this.onCompleteCallbacks.forEach(cb => cb());
    this.onCompleteCallbacks = [];
  }

  /**
   * Обработать одно событие
   */
  private async processEvent(event: AnimationEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.length === 0) {
      return;
    }

    // Выполняем все обработчики последовательно
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('Error in animation handler:', error);
      }
    }
  }

  /**
   * Очистить очередь
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Пропустить текущую анимацию
   */
  skip(): void {
    if (this.queue.length > 0) {
      const event = this.queue[0];
      if (event.skippable) {
        this.queue.shift();
      }
    }
  }

  /**
   * Зарегистрировать callback по завершении всех анимаций
   */
  onComplete(callback: () => void): void {
    this.onCompleteCallbacks.push(callback);
  }

  /**
   * Проверить, идёт ли обработка анимаций
   */
  isAnimating(): boolean {
    return this.isProcessing || this.queue.length > 0;
  }

  /**
   * Получить длину очереди
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Инициализировать обработчики по умолчанию
   */
  private initDefaultHandlers(): void {
    // Обработчики по умолчанию могут быть добавлены из UI слоя
    // Здесь оставляем extension points для будущего расширения
  }

  /**
   * Получить длительность анимации в мс в зависимости от интенсивности
   */
  getDuration(baseDuration: number): number {
    switch (this.intensity) {
      case 'full':
        return baseDuration;
      case 'short':
        return baseDuration * 0.5;
      case 'minimal':
        return baseDuration * 0.2;
      default:
        return baseDuration;
    }
  }
}

/**
 * Создать экземпляр AnimationEventSystem
 */
export function createAnimationEventSystem(): AnimationEventSystem {
  return new AnimationEventSystem();
}

export default AnimationEventSystem;
