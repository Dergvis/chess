import { useEffect, useRef } from 'react';
import './CheckmateAnimation.css';

interface CheckmateAnimationProps {
  winner: 'w' | 'b';
  intensity: 'full' | 'short' | 'minimal';
  onComplete: () => void;
}

export type CheckmateReaction = 'flag' | 'suitcase' | 'crown' | 'fall';

export default function CheckmateAnimation({
  winner,
  intensity,
  onComplete,
}: CheckmateAnimationProps) {
  const timeoutRef = useRef<number | null>(null);
  
  // Случайный выбор реакции для проигравшего
  const reactions: CheckmateReaction[] = ['flag', 'suitcase', 'crown', 'fall'];
  const loserReaction = reactions[Math.floor(Math.random() * reactions.length)];

  useEffect(() => {
    const durations = {
      full: 2500,
      short: 1200,
      minimal: 500,
    };

    timeoutRef.current = window.setTimeout(() => {
      onComplete();
    }, durations[intensity]);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [intensity, onComplete]);

  return (
    <div className="checkmate-animation-overlay">
      <div className="checkmate-animation-scene">
        {/* Победитель */}
        <div className={`winner-side ${winner === 'w' ? 'white-winner' : 'black-winner'}`}>
          <div className="winner-king">
            <div className="winner-crown">👑</div>
            <div className="winner-face">🤩</div>
            <div className="winner-celebration">
              {intensity === 'full' && <div className="confetti" />}
            </div>
          </div>
          <div className="winner-text">
            {winner === 'w' ? 'Белые' : 'Чёрные'} выиграли!
          </div>
        </div>

        {/* Проигравший */}
        <div className={`loser-side ${loserReaction}`}>
          <div className="loser-king">
            <div className="loser-crown">
              👑
              {loserReaction === 'crown' && <div className="crown-slide" />}
            </div>
            <div className="loser-face">
              {loserReaction === 'flag' && '😞'}
              {loserReaction === 'suitcase' && '😔'}
              {loserReaction === 'crown' && '😳'}
              {loserReaction === 'fall' && '😵'}
            </div>
            
            {/* Реакции */}
            {loserReaction === 'flag' && <div className="white-flag" />}
            {loserReaction === 'suitcase' && <div className="suitcase" />}
            {loserReaction === 'fall' && <div className="theatrical-fall" />}
          </div>
        </div>

        {/* Текст "МАТ!" */}
        {intensity === 'full' && (
          <div className="checkmate-text">🏆 МАТ! 🏆</div>
        )}
      </div>
    </div>
  );
}
