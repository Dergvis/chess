import { useState, useEffect, useRef, useCallback } from 'react';
import type { DifficultyLevel } from '../../shared/types';
import type { PlayerHero } from '../../shared/types/progress';
import { getPlayerProgress } from '../../shared/storage/playerProgressStorage';
import { getPlayerHero } from '../../entities/character/playerHeroes';
import { getCharacter } from '../../entities/character/characters';
import HeroCarousel from './HeroCarousel';
import PremiumModal from './PremiumModal';
import './MatchSetupScreen.css';

// 5 уровней сложности с привязанными соперниками
const LEVELS: { level: DifficultyLevel; opponentId: string }[] = [
  { level: 'level_1', opponentId: 'bear' },
  { level: 'level_3', opponentId: 'fox' },
  { level: 'level_5', opponentId: 'owl' },
  { level: 'level_9', opponentId: 'lion' },
  { level: 'level_10', opponentId: 'dragon' },
];

interface MatchSetupScreenProps {
  onStartGame: (
    opponentId: string,
    difficulty: DifficultyLevel,
    pieceSkinId: string,
    playerColor: 'w' | 'b'
  ) => void;
  onBack: () => void;
  initialDifficulty: DifficultyLevel;
}

// Звёзды: уровень = количество закрашенных звёзд (из 5)
const levelStarCount: Record<number, number> = {
  0: 1, // Уровень 1
  1: 2, // Уровень 2
  2: 3, // Уровень 3
  3: 4, // Уровень 4
  4: 5, // Уровень 5
};

const opponentDescriptions = [
  "A simple opponent for learning the basics.",
  "A little trickier. Think about your move!",
  "Medium difficulty. Look carefully!",
  "A strong opponent for experienced players.",
  "A difficult opponent. Try your strongest plans.",
];

export default function MatchSetupScreen({
  onStartGame,
  onBack,
  initialDifficulty,
}: MatchSetupScreenProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(
    LEVELS.findIndex(l => l.level === initialDifficulty)
  );
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [showPremium, setShowPremium] = useState(false);

  // Swipe handling для карусели противников
  const opponentTrackRef = useRef<HTMLDivElement>(null);
  const opponentTouchStartX = useRef(0);
  const opponentIsSwiping = useRef(false);

  const handleOpponentTouchStart = useCallback((e: React.TouchEvent) => {
    opponentTouchStartX.current = e.touches[0].clientX;
    opponentIsSwiping.current = true;
  }, []);

  const handleOpponentTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!opponentIsSwiping.current) return;
    opponentIsSwiping.current = false;

    const deltaX = e.changedTouches[0].clientX - opponentTouchStartX.current;
    const threshold = 40;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        setSelectedLevel(prev => Math.max(0, prev - 1));
      } else {
        setSelectedLevel(prev => Math.min(LEVELS.length - 1, prev + 1));
      }
    }
  }, []);

  // Получаем выбранного героя
  const progress = getPlayerProgress();
  const selectedHero: PlayerHero | null =
    progress.selectedHero && progress.heroSelectionCompleted
      ? getPlayerHero(progress.selectedHero) || null
      : null;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const backgroundSrc = isMobile
    ? '/backgrounds/backgroundforallmobile.png'
    : '/backgrounds/backgroundforallweb.png';

  const handleStart = () => {
    const selected = LEVELS[selectedLevel];
    onStartGame(selected.opponentId, selected.level, 'default', playerColor);
  };

  const opponent = getCharacter(LEVELS[selectedLevel].opponentId);
  const stars = levelStarCount[selectedLevel] || 1;
  const description = opponentDescriptions[selectedLevel] || '';

  return (
    <div className="match-setup-screen" data-page="7">
      <img src={backgroundSrc} alt="Match Background" className="match-setup-bg" />
      <div className="match-setup-overlay" />
      <div className="match-setup-container animate-fadeIn">
        {/* Шапка */}
        <header className="match-setup-header">
          <button className="back-btn" onClick={onBack}>
            ← Back
          </button>
          <h1 className="match-setup-title">New game</h1>
        </header>

        <div className="match-setup-body">
          {/* Левая часть — Твой герой */}
          <section className="setup-section hero-section">
            <h2 className="setup-section-title hero-section-title">YOUR HERO</h2>
            <HeroCarousel
              selectedHero={selectedHero}
              onLockedClick={() => setShowPremium(true)}
            />
          </section>

          {/* Правая часть — Выбери противника */}
          <section className="setup-section opponent-section">
            <h2 className="setup-section-title opponent-section-title">CHOOSE AN OPPONENT</h2>

            <div
              className="opponent-carousel"
              ref={opponentTrackRef}
              onTouchStart={handleOpponentTouchStart}
              onTouchEnd={handleOpponentTouchEnd}
            >
              <button
                className="opponent-nav opponent-nav-prev"
                onClick={() => setSelectedLevel(Math.max(0, selectedLevel - 1))}
                disabled={selectedLevel === 0}
              >
                ‹
              </button>

              <div className="opponent-card">
                <div className="opponent-visual">
                  <img
                    src={opponent?.avatar || ''}
                    alt={opponent?.name || ''}
                    className="opponent-image"
                  />
                </div>
                <div className="opponent-info-row">
                  <h3 className="opponent-name">{opponent?.name || ''}</h3>
                  <p className="opponent-desc">{description}</p>
                  <div className="opponent-stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < stars ? 'star filled' : 'star'}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                className="opponent-nav opponent-nav-next"
                onClick={() => setSelectedLevel(Math.min(LEVELS.length - 1, selectedLevel + 1))}
                disabled={selectedLevel === LEVELS.length - 1}
              >
                ›
              </button>
            </div>

            {/* Точки уровня */}
            <div className="opponent-dots">
              {LEVELS.map((_, i) => (
                <span
                  key={i}
                  className={`opponent-dot ${i === selectedLevel ? 'active' : ''}`}
                  onClick={() => setSelectedLevel(i)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Выбор цвета фигур */}
        <section className="color-section">
          <h2 className="color-section-title">CHOOSE YOUR COLOUR</h2>
          <div className="color-options">
            <button
              className={`color-option ${playerColor === 'w' ? 'selected' : ''}`}
              onClick={() => setPlayerColor('w')}
            >
              <img
                src="/фигурки/белая Ladia.png"
                alt="White"
                className="color-piece-image"
              />
              <span className="color-name">White</span>
            </button>
            <button
              className={`color-option ${playerColor === 'b' ? 'selected' : ''}`}
              onClick={() => setPlayerColor('b')}
            >
              <img
                src="/фигурки/Ладья черн.png"
                alt="Black"
                className="color-piece-image"
              />
              <span className="color-name">Black</span>
            </button>
          </div>
        </section>

        <footer className="match-setup-footer">
          <button className="btn btn-primary btn-large start-game-btn" onClick={handleStart}>
            🚀 Start the game!
          </button>
        </footer>
      </div>

      {/* Модалка платной версии */}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}
    </div>
  );
}
