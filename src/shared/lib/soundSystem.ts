/**
 * Система звуковых эффектов для шахматной игры
 * Cartoon-звуки без резких/громких эффектов
 */

export type SoundEffect =
  | 'move'
  | 'capture'
  | 'check'
  | 'checkmate'
  | 'castling'
  | 'promotion'
  | 'gameStart'
  | 'gameOver'
  | 'buttonClick'
  | 'error';

export interface SoundConfig {
  url: string;
  volume: number;
  loop: boolean;
}

class SoundSystem {
  private sounds: Map<SoundEffect, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private masterVolume: number = 0.5;
  private isInitialized: boolean = false;

  /**
   * Инициализация звуковой системы
   * Вызывать после первого взаимодействия пользователя
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Регистрируем звуки (используем синтезированные или файлы)
    this.registerSounds();
    this.isInitialized = true;
  }

  /**
   * Регистрация звуков
   */
  private registerSounds(): void {
    // Для демо используем пустые звуки - в продакшене заменить на реальные файлы
    const soundConfigs: Record<SoundEffect, { frequency: number; duration: number; type: OscillatorType }> = {
      'move': { frequency: 300, duration: 100, type: 'sine' },
      'capture': { frequency: 200, duration: 150, type: 'triangle' },
      'check': { frequency: 400, duration: 200, type: 'sawtooth' },
      'checkmate': { frequency: 500, duration: 400, type: 'sine' },
      'castling': { frequency: 250, duration: 120, type: 'sine' },
      'promotion': { frequency: 600, duration: 300, type: 'sine' },
      'gameStart': { frequency: 350, duration: 200, type: 'sine' },
      'gameOver': { frequency: 280, duration: 300, type: 'triangle' },
      'buttonClick': { frequency: 800, duration: 50, type: 'sine' },
      'error': { frequency: 150, duration: 200, type: 'sawtooth' },
    };

    // Создаём звуки через Web Audio API для демо
    // В продакшене заменить на загрузку файлов
    Object.keys(soundConfigs).forEach((key) => {
      // Звук будет синтезирован при воспроизведении
      this.sounds.set(key as SoundEffect, null as any);
    });
  }

  /**
   * Воспроизвести звук
   */
  play(sound: SoundEffect, volume?: number): void {
    if (!this.enabled) return;

    // Для демо используем Web Audio API
    this.playSynthesizedSound(sound, volume);
  }

  /**
   * Синтез звука через Web Audio API
   */
  private playSynthesizedSound(sound: SoundEffect, volume?: number): void {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Параметры для каждого звука
    const params: Record<SoundEffect, { freq: number; duration: number; type: OscillatorType; slide?: number }> = {
      'move': { freq: 400, duration: 0.1, type: 'sine' },
      'capture': { freq: 300, duration: 0.15, type: 'triangle', slide: -100 },
      'check': { freq: 520, duration: 0.2, type: 'sine' },
      'checkmate': { freq: 520, duration: 0.3, type: 'sine', slide: -200 },
      'castling': { freq: 350, duration: 0.12, type: 'sine' },
      'promotion': { freq: 600, duration: 0.25, type: 'sine', slide: 100 },
      'gameStart': { freq: 440, duration: 0.2, type: 'sine' },
      'gameOver': { freq: 330, duration: 0.3, type: 'triangle', slide: -100 },
      'buttonClick': { freq: 800, duration: 0.05, type: 'sine' },
      'error': { freq: 200, duration: 0.2, type: 'sawtooth', slide: -50 },
    };

    const param = params[sound];
    
    oscillator.type = param.type;
    oscillator.frequency.setValueAtTime(param.freq, audioContext.currentTime);
    
    if (param.slide) {
      oscillator.frequency.exponentialRampToValueAtTime(
        param.freq + param.slide,
        audioContext.currentTime + param.duration
      );
    }

    // Настройка громкости
    const targetVolume = (volume ?? this.masterVolume) * 0.3; // Уменьшаем общую громкость
    gainNode.gain.setValueAtTime(targetVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + param.duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + param.duration);
  }

  /**
   * Воспроизвести звук взятия с случайным вариантом
   */
  playCapture(): void {
    const captureSounds: SoundEffect[] = ['capture'];
    const randomSound = captureSounds[Math.floor(Math.random() * captureSounds.length)];
    this.play(randomSound);
  }

  /**
   * Воспроизвести серию звуков (для мата)
   */
  playSequence(sounds: SoundEffect[], delay: number = 200): void {
    sounds.forEach((sound, index) => {
      setTimeout(() => this.play(sound), index * delay);
    });
  }

  /**
   * Включить/выключить звуки
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Установить общую громкость (0-1)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Проверка, включены ли звуки
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Очистка ресурсов
   */
  dispose(): void {
    this.sounds.forEach(sound => {
      if (sound) {
        sound.pause();
        sound.src = '';
      }
    });
    this.sounds.clear();
  }
}

// Синглтон
export const soundSystem = new SoundSystem();

export default soundSystem;
