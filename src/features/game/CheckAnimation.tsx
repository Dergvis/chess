import { useEffect, useRef } from 'react';
import './CheckAnimation.css';

interface CheckAnimationProps {
  intensity: 'full' | 'short' | 'minimal';
  onComplete: () => void;
}

export type CheckReaction = 'angry' | 'scared' | 'cry' | 'explode' | 'helmet';

export default function CheckAnimation({
  intensity,
  onComplete,
}: CheckAnimationProps) {
  const timeoutRef = useRef<number | null>(null);
  
  // Случайный выбор реакции
  const reactions: CheckReaction[] = ['angry', 'scared', 'cry', 'explode', 'helmet'];
  const reaction = reactions[Math.floor(Math.random() * reactions.length)];

  useEffect(() => {
    const durations = {
      full: 900,
      short: 500,
      minimal: 250,
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
    <div className="check-animation-overlay">
      <div className="check-animation-scene">
        {/* Реакция короля */}
        <div className={`king-reaction ${reaction}`}>
          <div className="king-crown">
            👑
            {reaction === 'helmet' && <div className="helmet-overlay">🛡️</div>}
          </div>
          <div className="king-face">
            {reaction === 'angry' && '😠'}
            {reaction === 'scared' && '😨'}
            {reaction === 'cry' && '😢'}
            {reaction === 'explode' && '🤯'}
            {reaction === 'helmet' && '😰'}
          </div>
          {reaction === 'cry' && <div className="tear" />}
          {reaction === 'explode' && <div className="explosion-lines" />}
        </div>

        {/* Текст "ШАХ!" */}
        {intensity === 'full' && (
          <div className="check-text">⚠️ CHECK!</div>
        )}
      </div>
    </div>
  );
}
