import {emit} from "../../world/events";
import {getAuth} from "../../shared/storage/authStorage";
import { useState, useEffect, useRef } from 'react';
import { startSplashPreload, stopPreload, preloadHeroAssets } from '../../shared/lib/videoPreloader';
import './SplashScreen.css';

interface SplashScreenProps {
  onPlay: () => void;
  onLogin: () => void;
}

export default function SplashScreen({ onPlay, onLogin }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoEnded, setVideoEnded] = useState(()=>localStorage.getItem("chezzies-intro-seen")==="1");

  // Определяем мобильное устройство синхронно — до первого рендера
  const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Запускаем видео (muted), таймер на 8 секунд
  useEffect(() => {
    if(videoEnded)return;
    const video = videoRef.current;
    if (!video) return;

    // Muted — автоплей работает
    video.muted = true;

    const tryPlay = async () => {
      try {
        await video.play();
        console.log('[SplashScreen] Video started (muted)');
        // Запускаем предзагрузку battle видео в фоне
        startSplashPreload();
        // Предзагружаем hero-ассеты (аватары + видео для экрана выбора героя)
        preloadHeroAssets();
      } catch (e) {
        console.log('[SplashScreen] Autoplay blocked');
        setTimeout(() => setVideoEnded(true), 1000);
      }
    };

    tryPlay();

    // Fallback-таймер на 10 сек — если автоплей заблокирован или видео зависло
    splashTimerRef.current = setTimeout(() => {
      setVideoEnded(true);
    }, 10000);

    return () => {
      if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
      // Останавливаем предзагрузку при уходе со splash
      stopPreload();
    };
  }, []);

  const handleVideoError = () => {
    console.log('[SplashScreen] Video error, showing fallback');
    setVideoEnded(true);
  };

  const handleVideoEnded = () => {
    localStorage.setItem("chezzies-intro-seen","1");
    emit("intro_video_completed");
    setVideoEnded(true);
  };

  const videoSrc = isMobile ? '/backgrounds/MobileBackgroundvideo.mp4' : '/backgrounds/WEBBackgroundvideo.mp4';
  const backgroundSrc = isMobile ? '/backgrounds/mobilebackground.png' : '/backgrounds/webbackground.png';

  // На мобильном — contain, чтобы всё видео было видно; на десктопе — cover
  const videoStyle: React.CSSProperties = isMobile
    ? { pointerEvents: 'none', objectFit: 'contain', width: '100%', height: '100%' }
    : { pointerEvents: 'none', objectFit: 'cover' };

  return (
    <div className="splash-screen" data-page="1">
      {!videoEnded ? (
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted
            playsInline
            loop={false}
            preload="auto"
            onEnded={handleVideoEnded}
            onError={handleVideoError}
            className="splash-video"
            style={videoStyle}
          />
        </>
      ) : (
        <>
          <img
            src={backgroundSrc}
            alt="Chezzies Background"
            className="splash-background"
          />
          <div className="splash-overlay" />
          <div className="splash-content animate-fadeIn">
            <div className="splash-buttons">
              <button className="btn-splash btn-play" onClick={()=>{localStorage.setItem("chezzies-intro-seen","1");emit("play_free_clicked");if(!getAuth().isLoggedIn)emit("guest_session_started");onPlay();}}>
                Play free
              </button>
              <button className="btn-splash btn-login" onClick={onLogin}>
                Already have a hero? Sign in
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
