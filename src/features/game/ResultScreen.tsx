import { useState, useEffect, useRef } from 'react';
import type { GameResult, Color, Character } from '../../shared/types';
import './ResultScreen.css';

interface ResultScreenProps {
  result: GameResult | null;
  playerColor: Color;
  opponent: Character | undefined;
  onNewGame: () => void;
  onHome: () => void;
}

export default function ResultScreen({
  result,
  playerColor,
  opponent,
  onNewGame,
  onHome,
}: ResultScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Определяем результат для игрока
  const getPlayerResult = () => {
    if (!result) return 'draw';
    if (result.winner === playerColor) return 'win';
    if (result.winner === 'draw' || result.winner === null) return 'draw';
    return 'lose';
  };

  const playerResult = getPlayerResult();

  // Проверяем, был ли мат (любой цвет) — показываем видео
  useEffect(() => {
    const isCheckmate = result?.reason === 'checkmate';

    if (isCheckmate) {
      setShowVideo(true);
      setShowResult(false);
    } else {
      // Не мат — сразу показываем результат
      setShowVideo(false);
      setTimeout(() => setShowResult(true), 100);
    }
  }, [result]);

  // После окончания видео — показываем результат
  const handleVideoEnded = () => {
    setShowVideo(false);
    // Воспроизводим фанфары
    playFanfare();
    setTimeout(() => setShowResult(true), 300);
  };

  // Фанфары через Web Audio API
  const playFanfare = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Фанфары —ascending major arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5]; // C5, E5, G5, C6, G5, C6
      const durations = [0.15, 0.15, 0.15, 0.3, 0.15, 0.4];
      let time = ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + durations[i]);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + durations[i] + 0.05);
        time += durations[i];
      });
    } catch (e) {
      console.log('[ResultScreen] Fanfare error:', e);
    }
  };

  const backgroundSrc = isMobile
    ? '/backgrounds/backgroundforallmobile.png'
    : '/backgrounds/backgroundforallweb.png';

  // Видео мата — зависит от цвета проигравшего
  const checkmateVideoSrc = (() => {
    // Если игрок проиграл (winner !== playerColor), значит мат поставили игроку
    // Если игрок выиграл, значит мат поставили противнику
    if (result?.winner === playerColor) {
      // Игрок победил — мат противнику (черному, если игрок белый)
      return playerColor === 'w'
        ? '/Video/checkmate_b.mp4'
        : '/Video/checkmate_w.mp4';
    } else {
      // Игрок проиграл — мат игроку
      return playerColor === 'w'
        ? '/Video/checkmate_w.mp4'
        : '/Video/checkmate_b.mp4';
    }
  })();

  const getResultTitle = () => {
    if (result?.reason === 'checkmate') {
      if (playerResult === 'win') return "🎉 Victory!";
      if (playerResult === 'lose') return "😢 Defeat";
    }
    if (result?.reason === 'stalemate') return "🤝 Stalemate!";
    if (result?.reason === 'resign') return playerResult === 'lose' ? "Defeat" : "Victory!";
    return "🤝 Draw!";
  };

  const getResultMessage = () => {
    if (result?.reason === 'resign') {
      return playerResult === 'lose'
        ? "You resigned. Your opponent won the game."
        : "Your opponent resigned. You won the game.";
    }

    if (playerResult === 'win') {
      return opponent?.reactions.lose[0] || "You won! Well played!";
    } else if (playerResult === 'lose') {
      return opponent?.reactions.win[0] || "Try again!";
    } else {
      return "An interesting game!";
    }
  };

  const getOpponentReaction = () => {
    if (result?.reason === 'resign') {
      return "Resignation";
    }

    if (playerResult === 'win') {
      return opponent?.reactions.lose[1] || '😔';
    } else if (playerResult === 'lose') {
      return opponent?.reactions.win[1] || '😄';
    } else {
      return '🙂';
    }
  };

  return (
    <div className="result-screen" data-page="8">
      <img
        src={backgroundSrc}
        alt="Result Background"
        className="result-background"
      />
      <div className="result-overlay" />

      {/* Видео мата перед показом результата */}
      {showVideo && (
        <div
          className="checkmate-video-container"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100dvh',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            overflow: 'hidden',
          }}
        >
          <video
            ref={videoRef}
            src={checkmateVideoSrc}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
            className="checkmate-video"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
          <div className="checkmate-video-overlay" />
        </div>
      )}

      {/* Результат матча */}
      {showResult && (
        <>
          {/* Конфетти при победе */}
          {playerResult === 'win' && <ConfettiEffect />}

          <div className="result-container animate-resultPop">
            <div className="result-header">
              <div className="result-emoji">{getOpponentReaction()}</div>
              <h1 className="result-title">{getResultTitle()}</h1>
              <p className="result-message">{getResultMessage()}</p>
            </div>

            <div className="result-info">
              {result && (
                <>
                  <div className="result-stat">
                    <span className="stat-label">Moves</span>
                    <span className="stat-value">{result.moves}</span>
                  </div>
                  <div className="result-stat">
                    <span className="stat-label">Reason</span>
                    <span className="stat-value">
                      {result.reason === 'checkmate' ? "Checkmate" :
                       result.reason === 'stalemate' ? "Stalemate" :
                       result.reason === 'resign' ? "Resignation" :
                       result.reason === 'timeout' ? "Time" : "Draw"}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="result-actions">
              <button className="btn btn-primary btn-large" onClick={onNewGame}>
                🔄 Play again
              </button>
              <button className="btn btn-secondary btn-large" onClick={onHome}>
                🏠 Menu
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ===== Конфетти-эффект ===== */

function ConfettiEffect() {
  const confettiCount = 60;
  const colors = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#F97316'];

  return (
    <div className="confetti-container">
      {Array.from({ length: confettiCount }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 3;
        const duration = 2 + Math.random() * 3;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 6 + Math.random() * 8;
        const rotation = Math.random() * 360;
        const shape = Math.random() > 0.5 ? '50%' : '0';

        return (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${left}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              width: `${size}px`,
              height: `${size * 0.6}px`,
              backgroundColor: color,
              borderRadius: shape,
              transform: `rotate(${rotation}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
