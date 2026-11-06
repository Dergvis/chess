import { useState, useRef, useCallback } from 'react';
import type { PlayerHero } from '../../shared/types/progress';

interface PersonaItem {
  id: string;
  name: string;
  description: string;
  image: string;
  lockedByDefault: boolean;
}

interface HeroCarouselProps {
  selectedHero: PlayerHero | null;
  onLockedClick: () => void;
}

const personas: PersonaItem[] = [
  {
    id: 'default',
    name: "White piece",
    description: "Classic chess style",
    image: '/фигурки/белая Ladia.png',
    lockedByDefault: false,
  },
  {
    id: 'ladiator',
    name: "Ladiator",
    description: "I charge up from storm clouds!",
    image: '/personas/Ladiator.png',
    lockedByDefault: true,
  },
  {
    id: 'laserhorse',
    name: "Laserhorse",
    description: "I can blow the roof off!",
    image: '/personas/Laserhorse.png',
    lockedByDefault: true,
  },
  {
    id: 'oficer',
    name: "Officer Cannon",
    description: "Even the moon is in my sights!",
    image: '/personas/Oficerbazuka.png',
    lockedByDefault: true,
  },
];

const heroToPersona: Record<string, string> = {
  knight: 'oficer',
  mage: 'ladiator',
  inventor: 'laserhorse',
};

export default function HeroCarousel({ selectedHero, onLockedClick }: HeroCarouselProps) {
  let defaultIndex = 0;
  const hasSelectedHero = !!(selectedHero && heroToPersona[selectedHero.id]);

  if (hasSelectedHero) {
    const idx = personas.findIndex(p => p.id === heroToPersona[selectedHero!.id]);
    if (idx >= 0) defaultIndex = idx;
  }

  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const trackRef = useRef<HTMLDivElement>(null);

  // Touch/swipe handling
  const touchStartX = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    isSwiping.current = false;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 40; // минимальная дистанция свайпа

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // свайп вправо — предыдущий
        setActiveIndex(prev => (prev - 1 + personas.length) % personas.length);
      } else {
        // свайп влево — следующий
        setActiveIndex(prev => (prev + 1) % personas.length);
      }
    }
  }, []);

  // Определяем, залочен ли текущий персонаж
  function isPersonaLocked(p: PersonaItem): boolean {
    if (p.id === 'default') return false;
    if (hasSelectedHero && p.id === heroToPersona[selectedHero!.id]) return false;
    return p.lockedByDefault;
  }

  const activePersona = personas[activeIndex];
  const locked = isPersonaLocked(activePersona);

  // Навигация — можно листать всех, на залоченных показываем модалку при клике
  function navigate(direction: 'next' | 'prev') {
    const step = direction === 'next' ? 1 : -1;
    const nextIdx = (activeIndex + step + personas.length) % personas.length;
    setActiveIndex(nextIdx);
  }

  // Клик на картинку — если залочена, показываем модалку
  function handleImageClick() {
    if (locked) onLockedClick();
  }

  return (
    <div className="hero-carousel">
      <div
        className="hero-carousel-visual"
        ref={trackRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={activePersona.image}
          alt={activePersona.name}
          className={`hero-carousel-media ${locked ? 'locked' : ''}`}
          onClick={handleImageClick}
        />

        {/* Замок поверх картинки */}
        {locked && (
          <div className="hero-carousel-lock" onClick={handleImageClick}>
            <span className="lock-icon">🔒</span>
          </div>
        )}

        {/* Стрелки */}
        <button className="carousel-arrow carousel-arrow-left" onClick={() => navigate('prev')}>
          ‹
        </button>
        <button className="carousel-arrow carousel-arrow-right" onClick={() => navigate('next')}>
          ›
        </button>
      </div>

      {/* Инфо */}
      <div className="hero-carousel-info">
        <h3 className="hero-carousel-name">{activePersona.name}</h3>
        <p className="hero-carousel-desc">{activePersona.description}</p>
      </div>

      {/* Точки */}
      <div className="hero-carousel-dots">
        {personas.map((p, i) => (
          <span
            key={p.id}
            className={`hero-carousel-dot ${i === activeIndex ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
