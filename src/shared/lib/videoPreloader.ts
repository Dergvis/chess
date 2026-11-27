/**
 * Система предзагрузки видео
 * Предзагружает видео в фоне во время splash экрана и между ходами
 */

// Приоритетные видео для предзагрузки (самые частые взятия в детских партиях)
const HIGH_PRIORITY_VIDEOS = [
  // Пешки бьют — самые частые
  'w_p_vs_p', 'w_p_vs_n', 'w_p_vs_b',
  'b_p_vs_p', 'b_p_vs_n', 'b_p_vs_b',
  // Королевы бьют — эффектные
  'w_q_vs_p', 'w_q_vs_k', 'w_q_vs_q',
  'b_q_vs_p', 'b_q_vs_k', 'b_q_vs_q',
  // Кони бьют — популярные
  'w_n_vs_p', 'w_n_vs_k',
  'b_n_vs_p', 'b_n_vs_k',
];

// Среднеприоритетные видео
const MEDIUM_PRIORITY_VIDEOS = [
  'w_r_vs_p', 'w_r_vs_k', 'w_b_vs_p', 'w_b_vs_k', 'w_k_vs_p',
  'b_r_vs_p', 'b_r_vs_k', 'b_b_vs_p', 'b_b_vs_k', 'b_k_vs_p',
  'w_n_vs_n', 'w_n_vs_b', 'w_n_vs_r', 'w_n_vs_q',
  'b_n_vs_n', 'b_n_vs_b', 'b_n_vs_r', 'b_n_vs_q',
  'w_p_vs_r', 'w_p_vs_q', 'w_p_vs_k',
  'b_p_vs_r', 'b_p_vs_q', 'b_p_vs_k',
];

// Остальные видео — низкий приоритет
const LOW_PRIORITY_VIDEOS = [
  'w_q_vs_n', 'w_q_vs_b', 'w_q_vs_r',
  'b_q_vs_n', 'b_q_vs_b', 'b_q_vs_r',
  'w_r_vs_n', 'w_r_vs_b', 'w_r_vs_r', 'w_r_vs_q',
  'b_r_vs_n', 'b_r_vs_b', 'b_r_vs_r', 'b_r_vs_q',
  'w_b_vs_n', 'w_b_vs_b', 'w_b_vs_r', 'w_b_vs_q',
  'b_b_vs_n', 'b_b_vs_b', 'b_b_vs_r', 'b_b_vs_q',
  'w_k_vs_n', 'w_k_vs_b', 'w_k_vs_r', 'w_k_vs_q',
  'b_k_vs_n', 'b_k_vs_b', 'b_k_vs_r', 'b_k_vs_q',
];

// Checkmate видео
const CHECKMATE_VIDEOS = ['checkmate_w', 'checkmate_b'];

// Hero-ассеты для экрана выбора героя (аватары + видео)
const HERO_ASSETS = [
  { image: '/personas/Oficerbazuka.png', video: '/personas/oficerpushkavideo.mp4' },
  { image: '/personas/Ladiator.png', video: '/personas/Ladiator.mp4' },
  { image: '/personas/Laserhorse.png', video: '/personas/laserhorsevideo.mp4' },
];

// Кэш уже предзагруженных видео
const preloadedCache = new Set<string>();

// Кэш предзагруженных изображений
const imageCache = new Set<string>();

// Флаг активности предзагрузки
let isPreloading = false;

/**
 * Определить мобильное устройство
 * На мобильном НЕ предзагружаем все видео — BattleAnimation lazy-loadит по требованию
 */
function isMobileDevice(): boolean {
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Получить URL видео по имени
 */
function getVideoUrl(name: string): string {
  return `/Video/${name}.mp4`;
}

/**
 * Предзагрузить hero-видео (прямой путь /personas/)
 */
function preloadHeroVideo(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (preloadedCache.has(src)) {
      resolve();
      return;
    }

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none';

    const cleanup = () => {
      video.removeEventListener('canplaythrough', onLoaded);
      video.removeEventListener('error', onError);
      preloadedCache.add(src);
    };

    const onLoaded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      resolve();
    };

    video.addEventListener('canplaythrough', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });

    video.src = src;
    video.load();
  });
}

/**
 * Предзагрузить одно изображение
 */
function preloadSingleImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (imageCache.has(src)) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageCache.add(src);
      resolve();
    };
    img.onerror = () => {
      resolve(); // Не фейлим
    };
    img.src = src;
  });
}

/**
 * Предзагрузить все hero-ассеты (PNG + MP4) параллельно
 * Вызывается во время splash экрана
 *
 * На мобильном — НЕ грузим, hero экран загрузит сам по необходимости
 */
export function preloadHeroAssets(): void {
  if (isMobileDevice()) {
    console.log('[VideoPreloader] Mobile: skipping hero assets preload, will load on demand');
    return;
  }

  console.log('[VideoPreloader] Starting hero assets preload...');

  // Загружаем все параллельно
  const promises = HERO_ASSETS.flatMap(asset => [
    preloadSingleImage(asset.image),
    preloadHeroVideo(asset.video),
  ]);

  Promise.all(promises)
    .then(() => {
      console.log('[VideoPreloader] All hero assets preloaded');
    });
}

/**
 * Предзагрузить одно видео
 */
function preloadSingleVideo(name: string): Promise<void> {
  return new Promise((resolve) => {
    if (preloadedCache.has(name)) {
      resolve();
      return;
    }

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none'; // Не показываем

    const cleanup = () => {
      video.removeEventListener('canplaythrough', onLoaded);
      video.removeEventListener('error', onError);
      preloadedCache.add(name);
    };

    const onLoaded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      resolve(); // Не фейлим — просто пропускаем
    };

    video.addEventListener('canplaythrough', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });

    video.src = getVideoUrl(name);
    video.load();
  });
}

/**
 * Предзагрузить массив видео последовательно
 */
async function preloadVideoList(names: string[], delayMs = 200): Promise<void> {
  for (const name of names) {
    if (!isPreloading) break;
    if (preloadedCache.has(name)) continue;

    await preloadSingleVideo(name);

    // Небольшая задержка между видео чтобы не перегружать сеть
    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

/**
 * Запустить предзагрузку приоритетных видео
 * Вызывается во время splash экрана
 *
 * Десктоп: загружаем все приоритеты + checkmate
 * Мобильный: ТОЛЬКО checkmate видео, battle видео lazy-loadятся через BattleAnimation
 */
export function startSplashPreload(): void {
  if (isPreloading) return;
  isPreloading = true;

  const mobile = isMobileDevice();
  console.log(`[VideoPreloader] Starting splash preload (mobile: ${mobile})...`);

  // Checkmate видео (всего 2, маленькие ~5MB каждое) — всегда
  preloadVideoList(CHECKMATE_VIDEOS, 100).then(() => {
    console.log('[VideoPreloader] Checkmate videos preloaded');
  });

  // На мобильном — НЕ грузим battle видео, пусть BattleAnimation lazy-loadит по требованию
  if (mobile) {
    console.log('[VideoPreloader] Mobile: skipping battle video preload, will lazy-load on demand');
    isPreloading = false;
    return;
  }

  // Десктоп: грузим все battle видео
  preloadVideoList(HIGH_PRIORITY_VIDEOS, 150).then(() => {
    console.log('[VideoPreloader] High priority videos preloaded');

    // После высокоприоритетных — среднеприоритетные
    if (isPreloading) {
      preloadVideoList(MEDIUM_PRIORITY_VIDEOS, 200).then(() => {
        console.log('[VideoPreloader] Medium priority videos preloaded');

        // Низкоприоритетные — в самом конце
        if (isPreloading) {
          preloadVideoList(LOW_PRIORITY_VIDEOS, 250).then(() => {
            console.log('[VideoPreloader] All videos preloaded');
            isPreloading = false;
          });
        }
      });
    }
  });
}

/**
 * Остановить предзагрузку
 */
export function stopPreload(): void {
  isPreloading = false;
  console.log('[VideoPreloader] Preload stopped');
}

/**
 * Проверить, предзагружено ли видео
 */
export function isVideoPreloaded(name: string): boolean {
  return preloadedCache.has(name);
}

/**
 * Предзагрузить конкретное видео (например, при выборе цвета)
 */
export function preloadSpecificVideo(name: string): Promise<void> {
  return preloadSingleVideo(name);
}

/**
 * Предзагрузить checkmate видео для конкретного цвета
 */
export function preloadCheckmateForColor(color: 'w' | 'b'): Promise<void> {
  const videoName = color === 'w' ? 'checkmate_w' : 'checkmate_b';
  return preloadSingleVideo(videoName);
}

/**
 * Получить статистику предзагрузки
 */
export function getPreloadStats(): { total: number; preloaded: number; pending: number } {
  const total = HIGH_PRIORITY_VIDEOS.length + MEDIUM_PRIORITY_VIDEOS.length + LOW_PRIORITY_VIDEOS.length + CHECKMATE_VIDEOS.length;
  return {
    total,
    preloaded: preloadedCache.size,
    pending: total - preloadedCache.size,
  };
}
