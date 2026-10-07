import { useRef, useState } from 'react';
import type { PlayerHero } from '../../shared/types/progress';
import { getAllPlayerHeroes } from '../../entities/character/playerHeroes';
import { selectHero } from '../../shared/storage/playerProgressStorage';
import './HeroSelectScreen.css';

interface HeroSelectScreenProps {
  onHeroSelected: (heroId?: PlayerHero['id']) => void;
  localOnly?: boolean;
}

export default function HeroSelectScreen({ onHeroSelected, localOnly = false }: HeroSelectScreenProps) {
  const heroes = getAllPlayerHeroes();
  const track=useRef<HTMLDivElement>(null);
  const [slide,setSlide]=useState(0);
  const goSlide=(index:number)=>{const element=track.current?.children[index] as HTMLElement|undefined;if(element){element.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest',inline:'center'});setSlide(index);}};
  const updateSlide=()=>{if(!track.current)return;const center=track.current.getBoundingClientRect().left+track.current.clientWidth/2;let nearest=0,distance=Infinity;Array.from(track.current.children).forEach((child,i)=>{const r=child.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-center);if(d<distance){distance=d;nearest=i}});setSlide(nearest);};
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (heroId: string) => {
    setSelectedId(heroId);
  };

  const handleConfirm = () => {
    if (!selectedId) return;
    if (!localOnly) selectHero(selectedId as PlayerHero['id']);
    onHeroSelected(selectedId as PlayerHero['id']);
  };

  return (
    <div className="hero-select-screen">
      <div className="hero-select-bg" />
      <div className="hero-select-container">
        <div className="hero-select-header">
          <h1 className="hero-select-title">Choose your hero!</h1>
          <p className="hero-select-subtitle">
            This is your chess hero. You will grow and develop together!
          </p>
        </div>

        <div className="hero-cards" ref={track} onScroll={updateSlide}>
          {heroes.map(hero => (
            <HeroCard
              key={hero.id}
              hero={hero}
              isSelected={selectedId === hero.id}
              onSelect={() => handleSelect(hero.id)}
            />
          ))}
        </div>

        <nav className="hero-slide-controls" aria-label="Hero pages"><button type="button" aria-label="Previous hero" disabled={slide===0} onClick={()=>goSlide(slide-1)}>←</button><div>{heroes.map((hero,i)=><button key={hero.id} type="button" aria-label={"Show hero: "+hero.name} aria-current={slide===i?'page':undefined} onClick={()=>goSlide(i)}><i/></button>)}</div><button type="button" aria-label="Next hero" disabled={slide===heroes.length-1} onClick={()=>goSlide(slide+1)}>→</button><small>Swipe through heroes · {slide+1} / {heroes.length}</small></nav>
        <button
          className={`btn-hero-confirm ${selectedId ? 'active' : ''}`}
          disabled={!selectedId}
          onClick={handleConfirm}
        >
          {selectedId ? "Start the adventure!" : "Choose a hero"}
        </button>
      </div>
    </div>
  );
}

interface HeroCardProps {
  hero: PlayerHero;
  isSelected: boolean;
  onSelect: () => void;
}

function HeroCard({ hero, isSelected, onSelect }: HeroCardProps) {
  const avatarSrc = hero.avatar.startsWith('/') ? hero.avatar : undefined;

  const handleVideoEnded = () => {
    const video = document.querySelector<HTMLVideoElement>(`[data-hero-video="${hero.id}"]`);
    if (video) {
      video.currentTime = 0;
      video.play();
    }
  };

  return (
    <div
      className={`hero-card ${isSelected ? 'selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={hero.name}
      aria-pressed={isSelected}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      style={{
        borderColor: isSelected ? hero.color : 'transparent',
        boxShadow: isSelected ? `0 0 30px ${hero.color}66` : 'none',
      }}
      onClick={onSelect}
    >
      <div className="hero-visual">
        <div className="hero-avatar-big">
          {isSelected && hero.video ? (
            <video
              data-hero-video={hero.id}
              src={hero.video}
              autoPlay
              muted
              loop={false}
              playsInline
              className="hero-avatar-video"
              onEnded={handleVideoEnded}
            />
          ) : avatarSrc ? (
            <img src={avatarSrc} alt={hero.name} className="hero-avatar-image" />
          ) : (
            hero.avatar
          )}
        </div>
        <div className="hero-glow" style={{ background: hero.color }} />
      </div>
      <div className="hero-info">
        <h3 className="hero-name" style={{ color: hero.color }}>
          {hero.name}
        </h3>
        <p className="hero-description">{hero.description}</p>
      </div>
      {isSelected && (
        <div className="hero-selected-badge">✓</div>
      )}
    </div>
  );
}
