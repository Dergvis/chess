import { useEffect, useRef, useState } from 'react';
import { isSoundEnabled, onSoundChange } from './videoSound';
import './BattleAnimation.css';

interface BattleAnimationProps {
  videoSrc: string | null;
  onEnded: () => void;
}

export default function BattleAnimation({ videoSrc, onEnded }: BattleAnimationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  useEffect(() => {
    return onSoundChange(setSoundOn);
  }, []);

  // На мобильных начинаем muted; звук включается после первого жеста
  const muted = !soundOn;

  useEffect(() => {
    if (!videoSrc || !videoRef.current) return;

    const video = videoRef.current;
    let cancelled = false;

    video.src = videoSrc;
    video.muted = !soundOn;
    video.preload = 'auto';
    video.load();

    // Проверяем readyState — если видео уже в кэше (предзагружено),
    // readyState будет 4 (HAVE_ENOUGH_DATA) и можно играть сразу
    const tryPlayImmediately = async () => {
      if (cancelled) return;
      if (video.readyState >= 3) {
        // Видео уже загружено — играем сразу
        try {
          await video.play();
          console.log('[BattleAnimation] Instant play (cached):', videoSrc);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    };

    // Пробуем мгновенный старт
    tryPlayImmediately().then(didPlay => {
      if (didPlay || cancelled) return;

      // Видео не в кэше — ждём загрузки
      const onLoadedData = async () => {
        if (cancelled) return;
        try {
          await video.play();
          console.log('[BattleAnimation] Playing after load:', videoSrc);
        } catch (err: unknown) {
          if ((err as Error).name !== 'AbortError') {
            console.error('[BattleAnimation] Play error:', err);
            // Если autoplay заблокирован — пробуем с muted
            if (!video.muted) {
              video.muted = true;
              video.play().catch(() => {
                // Всё равно не получилось — пропускаем анимацию
                onEnded();
              });
            }
          }
        }
      };

      video.addEventListener('loadeddata', onLoadedData, { once: true });

      // Fallback таймер — если видео не загрузилось за 5 секунд, пропускаем
      setTimeout(() => {
        if (!cancelled && video.readyState < 2) {
          console.log('[BattleAnimation] Load timeout, skipping:', videoSrc);
          onEnded();
        }
      }, 5000);
    });

    return () => {
      cancelled = true;
    };
  }, [videoSrc, soundOn, onEnded]);

  // При переключении muted — обновляем текущее видео
  useEffect(() => {
    if (videoRef.current && videoRef.current.muted !== muted) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.target as HTMLVideoElement;
    console.error('[BattleAnimation] Video error:', {
      src: video.src,
      error: video.error,
      networkState: video.networkState,
      readyState: video.readyState,
    });
  };

  if (!videoSrc) {
    return null;
  }

  return (
    <video data-page="5"
      ref={videoRef}
      src={videoSrc}
      onEnded={onEnded}
      onError={handleVideoError}
      playsInline
      autoPlay
      preload="auto"
      muted={muted}
    />
  );
}
