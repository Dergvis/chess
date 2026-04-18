import { useEffect, useRef } from 'react';
import './CaptureAnimation.css';

interface CaptureAnimationProps {
  animationType: string;
  fromFile: number;
  fromRank: number;
  toFile: number;
  toRank: number;
  intensity: 'full' | 'short' | 'minimal';
  onComplete: () => void;
}

export default function CaptureAnimation({
  animationType,
  fromFile,
  fromRank,
  toFile,
  toRank,
  intensity,
  onComplete,
}: CaptureAnimationProps) {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const durations: Record<string, number> = {
      full: 1.8,
      short: 1.0,
      minimal: 0.3,
    };

    const duration = (durations[intensity] || 1.5) * 1000;

    timeoutRef.current = window.setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [intensity, onComplete]);

  // Позиция клетки взятия в процентах (центр клетки)
  const toX = toFile * 12.5 + 6.25;
  const toY = (7 - toRank) * 12.5 + 6.25;
  
  // Позиция откуда пришла фигура
  const fromX = fromFile * 12.5 + 6.25;
  const fromY = (7 - fromRank) * 12.5 + 6.25;

  return (
    <div className="capture-animation-overlay">
      <div className="capture-animation-scene">
        {/* Контейнер эффектов - позиционируется в клетку взятия */}
        <div
          className="effect-container"
          style={{
            '--cell-x': `${toX}%`,
            '--cell-y': `${toY}%`,
            '--from-x': `${fromX}%`,
            '--from-y': `${fromY}%`,
          } as React.CSSProperties}
        >
          {/* Атакующая фигура - движется от from к to */}
          <div className="attacker-figure">
            <div className="figure-body attacker">♟️</div>
          </div>

          {/* Защищающаяся фигура - стоит на клетке и улетает */}
          <div className="defender-figure">
            <div className="figure-body defender">😮</div>
          </div>

          {/* Эффекты для разных типов анимаций - ВСЕ позиционируются относительно effect-container */}
          {animationType === 'catapult' && <CatapultEffect />}
          {animationType === 'cannon' && <CannonEffect />}
          {animationType === 'spring_launch' && <SpringEffect />}
          {animationType === 'ambulance' && <AmbulanceEffect />}
          {animationType === 'trapdoor' && <TrapdoorEffect />}
          {animationType === 'rocket' && <RocketEffect />}
          {animationType === 'fan_blow' && <FanEffect />}
          {animationType === 'banana_slip' && <BananaEffect />}
          {animationType === 'balloons_lift' && <BalloonsEffect />}
          {animationType === 'teleport' && <TeleportEffect />}
          {animationType === 'spider_web' && <SpiderEffect />}
          {animationType === 'broom_sweep' && <BroomEffect />}

          {/* Текст эффекта */}
          {intensity === 'full' && (
            <div className="capture-effect-text">💥</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== ЭФФЕКТЫ =====

function CatapultEffect() {
  return (
    <div className="effect catapult-effect">
      {/* База катапульты */}
      <div className="catapult-base" />
      {/* Рычаг */}
      <div className="catapult-arm" />
      {/* Снаряд */}
      <div className="projectile" />
    </div>
  );
}

function CannonEffect() {
  return (
    <div className="effect cannon-effect">
      {/* Пушка */}
      <div className="cannon-body" />
      {/* Дым */}
      <div className="cannon-smoke" />
      {/* Ядро */}
      <div className="cannon-ball" />
    </div>
  );
}

function SpringEffect() {
  return (
    <div className="effect spring-effect">
      {/* Пружина */}
      <div className="spring-coil" />
    </div>
  );
}

function AmbulanceEffect() {
  return (
    <div className="effect ambulance-effect">
      {/* Корпус машины */}
      <div className="ambulance-body" />
      {/* Мигалка */}
      <div className="ambulance-light" />
      {/* Двери */}
      <div className="ambulance-door" />
    </div>
  );
}

function RocketEffect() {
  return (
    <div className="effect rocket-effect">
      {/* Ракета */}
      <div className="rocket-body" />
      {/* Пламя */}
      <div className="rocket-flame" />
      {/* Дым */}
      <div className="rocket-smoke" />
    </div>
  );
}

function TrapdoorEffect() {
  return (
    <div className="effect trapdoor-effect">
      {/* Люк */}
      <div className="trap-door" />
      {/* Дыра */}
      <div className="trap-hole" />
    </div>
  );
}

function FanEffect() {
  return (
    <div className="effect fan-effect">
      {/* Вентилятор */}
      <div className="fan-base" />
      {/* Лопасти */}
      <div className="fan-blades" />
      {/* Линии ветра */}
      <div className="wind-lines" />
    </div>
  );
}

function BananaEffect() {
  return (
    <div className="effect banana-effect">
      {/* Банановая кожура */}
      <div className="banana-peel" />
      {/* Звёздочки */}
      <div className="slip-stars" />
    </div>
  );
}

function BalloonsEffect() {
  return (
    <div className="effect balloons-effect">
      {/* Шарики */}
      <div className="balloon red" />
      <div className="balloon blue" />
      <div className="balloon yellow" />
      {/* Верёвочки */}
      <div className="balloon-strings" />
    </div>
  );
}

function TeleportEffect() {
  return (
    <div className="effect teleport-effect">
      {/* Телепорт кольцо */}
      <div className="teleport-ring" />
      {/* Вспышка */}
      <div className="teleport-flash" />
    </div>
  );
}

function SpiderEffect() {
  return (
    <div className="effect spider-effect">
      {/* Паук */}
      <div className="spider-body" />
      {/* Паутина */}
      <div className="spider-web" />
      {/* Нить */}
      <div className="spider-thread" />
    </div>
  );
}

function BroomEffect() {
  return (
    <div className="effect broom-effect">
      {/* Ручка метлы */}
      <div className="broom-handle" />
      {/* Щетина */}
      <div className="broom-bristles" />
      {/* Пыль */}
      <div className="sweep-dust" />
    </div>
  );
}
