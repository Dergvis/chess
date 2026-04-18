import './ChessPiece.css';

interface ChessPieceProps {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
  selected?: boolean;
  isLastMove?: boolean;
  isCheck?: boolean;
}

export default function ChessPiece({ type, color, selected, isLastMove, isCheck }: ChessPieceProps) {
  const isWhite = color === 'w';
  
  // Цвета для белых и чёрных фигур
  const primaryColor = isWhite ? '#FFFFFF' : '#1a1a1a';
  const secondaryColor = isWhite ? '#E8E8E8' : '#2d2d2d';
  const accentColor = isWhite ? '#C0C0C0' : '#4a4a4a';
  const goldColor = '#FFD700';
  const skinColor = '#FFD900'; // Lego skin tone
  const handColor = skinColor;

  // SVG для каждого типа фигуры в стиле Lego-minifigure
  const renderPiece = () => {
    switch (type) {
      case 'p': // Пешка - простой воин/лучник
        return (
          <svg viewBox="0 0 100 120" className="piece-svg" preserveAspectRatio="xMidYMid meet">
            {/* Голова */}
            <circle cx="50" cy="22" r="14" fill={skinColor} stroke="#000" strokeWidth="1.5"/>
            {/* Глаза */}
            <ellipse cx="45" cy="20" rx="3" ry="4" fill="#000"/>
            <ellipse cx="55" cy="20" rx="3" ry="4" fill="#000"/>
            {/* Брови */}
            <path d="M 42 15 Q 45 13 48 15" stroke="#000" strokeWidth="1.5" fill="none"/>
            <path d="M 52 15 Q 55 13 58 15" stroke="#000" strokeWidth="1.5" fill="none"/>
            {/* Улыбка */}
            <path d="M 44 27 Q 50 32 56 27" stroke="#000" strokeWidth="1.5" fill="none"/>
            {/* Шлем/Головной убор */}
            <path d="M 35 18 L 35 12 Q 50 5 65 12 L 65 18" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Тело */}
            <rect x="35" y="38" width="30" height="35" rx="4" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Щит на груди */}
            <path d="M 45 45 L 55 45 L 55 58 L 50 63 L 45 58 Z" fill={accentColor} stroke="#000" strokeWidth="1"/>
            {/* Руки */}
            <rect x="25" y="40" width="10" height="25" rx="5" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            <rect x="65" y="40" width="10" height="25" rx="5" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Кисти рук */}
            <circle cx="30" cy="68" r="6" fill={handColor} stroke="#000" strokeWidth="1"/>
            <circle cx="70" cy="68" r="6" fill={handColor} stroke="#000" strokeWidth="1"/>
            {/* Ноги */}
            <rect x="38" y="75" width="10" height="25" rx="3" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            <rect x="52" y="75" width="10" height="25" rx="3" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Ботинки */}
            <rect x="36" y="98" width="14" height="8" rx="2" fill={secondaryColor} stroke="#000" strokeWidth="1"/>
            <rect x="50" y="98" width="14" height="8" rx="2" fill={secondaryColor} stroke="#000" strokeWidth="1"/>
          </svg>
        );
      
      case 'r': // Ладья - страж башни с копьём
        return (
          <svg viewBox="0 0 100 120" className="piece-svg" preserveAspectRatio="xMidYMid meet">
            {/* Голова */}
            <circle cx="50" cy="22" r="14" fill={skinColor} stroke="#000" strokeWidth="1.5"/>
            {/* Глаза */}
            <ellipse cx="45" cy="20" rx="3" ry="4" fill="#000"/>
            <ellipse cx="55" cy="20" rx="3" ry="4" fill="#000"/>
            {/* Улыбка */}
            <path d="M 44 27 Q 50 32 56 27" stroke="#000" strokeWidth="1.5" fill="none"/>
            {/* Шлем башенный */}
            <rect x="33" y="8" width="34" height="12" rx="2" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            <rect x="36" y="3" width="8" height="6" fill={primaryColor} stroke="#000" strokeWidth="1"/>
            <rect x="46" y="3" width="8" height="6" fill={primaryColor} stroke="#000" strokeWidth="1"/>
            <rect x="56" y="3" width="8" height="6" fill={primaryColor} stroke="#000" strokeWidth="1"/>
            {/* Тело с эмблемой */}
            <rect x="33" y="38" width="34" height="38" rx="4" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Башня на груди */}
            <rect x="42" y="45" width="16" height="20" fill={accentColor} stroke="#000" strokeWidth="1"/>
            <rect x="44" y="42" width="4" height="5" fill={accentColor} stroke="#000" strokeWidth="1"/>
            <rect x="52" y="42" width="4" height="5" fill={accentColor} stroke="#000" strokeWidth="1"/>
            {/* Пояс */}
            <rect x="33" y="68" width="34" height="6" fill="#8B4513" stroke="#000" strokeWidth="1"/>
            <rect x="47" y="69" width="6" height="4" fill={goldColor} stroke="#000" strokeWidth="0.5"/>
            {/* Руки */}
            <rect x="22" y="40" width="12" height="28" rx="5" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            <rect x="66" y="40" width="12" height="28" rx="5" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Кисти */}
            <circle cx="28" cy="72" r="6" fill={handColor} stroke="#000" strokeWidth="1"/>
            <circle cx="72" cy="72" r="6" fill={handColor} stroke="#000" strokeWidth="1"/>
            {/* Копьё в руке */}
            <line x1="28" y1="72" x2="20" y2="15" stroke="#8B4513" strokeWidth="4"/>
            <polygon points="20,15 17,25 23,25" fill={accentColor} stroke="#000" strokeWidth="1"/>
            {/* Ноги */}
            <rect x="37" y="78" width="11" height="24" rx="3" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            <rect x="52" y="78" width="11" height="24" rx="3" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Ботинки */}
            <rect x="35" y="100" width="15" height="8" rx="2" fill={secondaryColor} stroke="#000" strokeWidth="1"/>
            <rect x="50" y="100" width="15" height="8" rx="2" fill={secondaryColor} stroke="#000" strokeWidth="1"/>
          </svg>
        );
      
      case 'n': // Конь - рыцарь на коне
        return (
          <svg viewBox="0 0 120 120" className="piece-svg" preserveAspectRatio="xMidYMid meet">
            {/* Конь */}
            <ellipse cx="70" cy="90" rx="35" ry="20" fill={isWhite ? '#F5F5F5' : '#4a4a4a'} stroke="#000" strokeWidth="1.5"/>
            {/* Голова коня */}
            <ellipse cx="95" cy="75" rx="18" ry="14" fill={isWhite ? '#F5F5F5' : '#4a4a4a'} stroke="#000" strokeWidth="1.5"/>
            {/* Уши коня */}
            <polygon points="88,62 92,52 96,62" fill={isWhite ? '#F5F5F5' : '#4a4a4a'} stroke="#000" strokeWidth="1"/>
            <polygon points="98,62 102,52 106,62" fill={isWhite ? '#F5F5F5' : '#4a4a4a'} stroke="#000" strokeWidth="1"/>
            {/* Глаз коня */}
            <circle cx="98" cy="72" r="3" fill="#000"/>
            {/* Ноздри коня */}
            <ellipse cx="108" cy="78" rx="3" ry="2" fill="#333"/>
            {/* Ноги коня */}
            <rect x="55" y="105" width="8" height="15" rx="2" fill={isWhite ? '#F5F5F5' : '#4a4a4a'} stroke="#000" strokeWidth="1"/>
            <rect x="75" y="105" width="8" height="15" rx="2" fill={isWhite ? '#F5F5F5' : '#4a4a4a'} stroke="#000" strokeWidth="1"/>
            {/* Рыцарь на коне */}
            {/* Тело рыцаря */}
            <rect x="35" y="45" width="28" height="35" rx="4" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Голова рыцаря */}
            <circle cx="49" cy="30" r="13" fill={skinColor} stroke="#000" strokeWidth="1.5"/>
            {/* Шлем с забралом */}
            <path d="M 34 25 L 34 18 Q 49 10 64 18 L 64 25 L 64 32 L 34 32 Z" fill={accentColor} stroke="#000" strokeWidth="1.5"/>
            <rect x="42" y="20" width="14" height="8" fill={accentColor} stroke="#000" strokeWidth="1"/>
            {/* Глаза в щели шлема */}
            <ellipse cx="46" cy="24" rx="2" ry="2" fill="#000"/>
            <ellipse cx="52" cy="24" rx="2" ry="2" fill="#000"/>
            {/* Перо на шлеме */}
            <path d="M 49 18 Q 55 8 62 12" stroke="#000" strokeWidth="3" fill="none"/>
            {/* Рука с мечом */}
            <rect x="58" y="47" width="10" height="25" rx="5" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            <circle cx="63" cy="75" r="6" fill={handColor} stroke="#000" strokeWidth="1"/>
            {/* Меч */}
            <rect x="60" y="50" width="6" height="35" fill={accentColor} stroke="#000" strokeWidth="1"/>
            <rect x="57" y="78" width="12" height="4" fill={goldColor} stroke="#000" strokeWidth="1"/>
            {/* Щит */}
            <path d="M 30 55 L 42 55 L 42 75 L 36 82 L 30 75 Z" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            <path d="M 33 60 L 39 60 L 39 70 L 36 74 L 33 70 Z" fill={accentColor} stroke="#000" strokeWidth="1"/>
          </svg>
        );
      
      case 'b': // Слон - визирь/советник с посохом
        return (
          <svg viewBox="0 0 100 120" className="piece-svg" preserveAspectRatio="xMidYMid meet">
            {/* Голова */}
            <circle cx="50" cy="22" r="14" fill={skinColor} stroke="#000" strokeWidth="1.5"/>
            {/* Глаза */}
            <ellipse cx="45" cy="20" rx="3" ry="4" fill="#000"/>
            <ellipse cx="55" cy="20" rx="3" ry="4" fill="#000"/>
            {/* Брови умные */}
            <path d="M 42 16 Q 45 14 48 16" stroke="#000" strokeWidth="1.5" fill="none"/>
            <path d="M 52 16 Q 55 14 58 16" stroke="#000" strokeWidth="1.5" fill="none"/>
            {/* Улыбка */}
            <path d="M 44 27 Q 50 32 56 27" stroke="#000" strokeWidth="1.5" fill="none"/>
            {/* Тюрбан/головной убор */}
            <ellipse cx="50" cy="15" rx="16" ry="10" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            <circle cx="50" cy="12" r="4" fill={goldColor} stroke="#000" strokeWidth="1"/>
            {/* Тело с плащом */}
            <path d="M 32 38 L 68 38 L 72 78 L 28 78 Z" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Воротник */}
            <ellipse cx="50" cy="38" rx="12" ry="6" fill={accentColor} stroke="#000" strokeWidth="1"/>
            {/* Узор на одежде */}
            <path d="M 45 45 Q 50 55 55 45" stroke={accentColor} strokeWidth="2" fill="none"/>
            <path d="M 43 52 Q 50 62 57 52" stroke={accentColor} strokeWidth="2" fill="none"/>
            {/* Руки */}
            <rect x="22" y="42" width="10" height="28" rx="5" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            <rect x="68" y="42" width="10" height="28" rx="5" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Кисти */}
            <circle cx="27" cy="73" r="6" fill={handColor} stroke="#000" strokeWidth="1"/>
            <circle cx="73" cy="73" r="6" fill={handColor} stroke="#000" strokeWidth="1"/>
            {/* Посох в руке */}
            <line x1="73" y1="73" x2="73" y2="25" stroke="#8B4513" strokeWidth="4"/>
            <circle cx="73" cy="22" r="6" fill={goldColor} stroke="#000" strokeWidth="1"/>
            {/* Ноги (видны из-под плаща) */}
            <rect x="40" y="78" width="8" height="20" rx="3" fill={secondaryColor} stroke="#000" strokeWidth="1"/>
            <rect x="52" y="78" width="8" height="20" rx="3" fill={secondaryColor} stroke="#000" strokeWidth="1"/>
            {/* Ботинки */}
            <rect x="38" y="96" width="12" height="8" rx="2" fill={accentColor} stroke="#000" strokeWidth="1"/>
            <rect x="50" y="96" width="12" height="8" rx="2" fill={accentColor} stroke="#000" strokeWidth="1"/>
          </svg>
        );
      
      case 'q': // Ферзь - королева
        return (
          <svg viewBox="0 0 100 120" className="piece-svg" preserveAspectRatio="xMidYMid meet">
            {/* Голова */}
            <circle cx="50" cy="22" r="14" fill={skinColor} stroke="#000" strokeWidth="1.5"/>
            {/* Глаза с ресницами */}
            <ellipse cx="45" cy="20" rx="3" ry="4" fill="#000"/>
            <ellipse cx="55" cy="20" rx="3" ry="4" fill="#000"/>
            <path d="M 42 16 Q 45 14 48 16" stroke="#000" strokeWidth="1" fill="none"/>
            <path d="M 52 16 Q 55 14 58 16" stroke="#000" strokeWidth="1" fill="none"/>
            {/* Улыбка */}
            <path d="M 44 27 Q 50 33 56 27" stroke="#E91E63" strokeWidth="1.5" fill="none"/>
            {/* Румянец */}
            <circle cx="40" cy="25" r="3" fill="#FFB6C1" opacity="0.6"/>
            <circle cx="60" cy="25" r="3" fill="#FFB6C1" opacity="0.6"/>
            {/* Корона */}
            <path d="M 33 18 L 38 5 L 43 18 L 50 2 L 57 18 L 62 5 L 67 18 Z" fill={goldColor} stroke="#000" strokeWidth="1.5"/>
            <circle cx="38" cy="10" r="2" fill="#E91E63"/>
            <circle cx="50" cy="8" r="2" fill="#E91E63"/>
            <circle cx="62" cy="10" r="2" fill="#E91E63"/>
            {/* Волосы */}
            <path d="M 34 18 Q 30 25 34 35" stroke="#8B4513" strokeWidth="4" fill="none"/>
            <path d="M 66 18 Q 70 25 66 35" stroke="#8B4513" strokeWidth="4" fill="none"/>
            {/* Тело с платьем */}
            <path d="M 32 38 L 68 38 L 75 85 L 25 85 Z" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* V-образный вырез */}
            <path d="M 40 38 L 50 52 L 60 38" fill={secondaryColor} stroke="#000" strokeWidth="1"/>
            {/* Украшения на платье */}
            <circle cx="50" cy="48" r="3" fill={goldColor} stroke="#000" strokeWidth="1"/>
            <circle cx="42" cy="55" r="2" fill={goldColor} stroke="#000" strokeWidth="0.5"/>
            <circle cx="58" cy="55" r="2" fill={goldColor} stroke="#000" strokeWidth="0.5"/>
            {/* Пояс */}
            <rect x="32" y="62" width="36" height="6" fill={goldColor} stroke="#000" strokeWidth="1"/>
            {/* Рукава */}
            <path d="M 32 40 L 22 55 L 26 60 L 34 50" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            <path d="M 68 40 L 78 55 L 74 60 L 66 50" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Кисти */}
            <circle cx="24" cy="62" r="6" fill={handColor} stroke="#000" strokeWidth="1"/>
            <circle cx="76" cy="62" r="6" fill={handColor} stroke="#000" strokeWidth="1"/>
            {/* Скипетр в руке */}
            <line x1="24" y1="62" x2="18" y2="35" stroke={goldColor} strokeWidth="3"/>
            <circle cx="18" cy="32" r="5" fill={goldColor} stroke="#000" strokeWidth="1"/>
            <circle cx="18" cy="30" r="2" fill="#E91E63"/>
            {/* Подол платья */}
            <path d="M 25 85 L 75 85 L 78 92 L 22 92 Z" fill={secondaryColor} stroke="#000" strokeWidth="1"/>
            {/* Ноги (не видны под платьем) */}
          </svg>
        );
      
      case 'k': // Король
        return (
          <svg viewBox="0 0 100 120" className="piece-svg" preserveAspectRatio="xMidYMid meet">
            {/* Голова */}
            <circle cx="50" cy="22" r="14" fill={skinColor} stroke="#000" strokeWidth="1.5"/>
            {/* Глаза */}
            <ellipse cx="45" cy="20" rx="3" ry="4" fill="#000"/>
            <ellipse cx="55" cy="20" rx="3" ry="4" fill="#000"/>
            {/* Брови */}
            <path d="M 42 17 Q 45 15 48 17" stroke="#000" strokeWidth="1.5" fill="none"/>
            <path d="M 52 17 Q 55 15 58 17" stroke="#000" strokeWidth="1.5" fill="none"/>
            {/* Улыбка */}
            <path d="M 44 27 Q 50 32 56 27" stroke="#000" strokeWidth="1.5" fill="none"/>
            {/* Борода */}
            <path d="M 38 30 Q 50 42 62 30" fill={secondaryColor} stroke="#000" strokeWidth="1"/>
            {/* Большая корона */}
            <rect x="34" y="10" width="32" height="10" rx="2" fill={goldColor} stroke="#000" strokeWidth="1.5"/>
            <path d="M 34 10 L 38 0 L 42 10" fill={goldColor} stroke="#000" strokeWidth="1.5"/>
            <path d="M 46 10 L 50 -2 L 54 10" fill={goldColor} stroke="#000" strokeWidth="1.5"/>
            <path d="M 58 10 L 62 0 L 66 10" fill={goldColor} stroke="#000" strokeWidth="1.5"/>
            {/* Рубин на короне */}
            <circle cx="50" cy="8" r="3" fill="#E91E63" stroke="#000" strokeWidth="0.5"/>
            {/* Тело с мантией */}
            <path d="M 30 38 L 70 38 L 78 90 L 22 90 Z" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Воротник мантии */}
            <ellipse cx="50" cy="38" rx="14" ry="8" fill="#E91E63" stroke="#000" strokeWidth="1"/>
            {/* Украшения на мантии */}
            <circle cx="50" cy="50" r="4" fill={goldColor} stroke="#000" strokeWidth="1"/>
            <circle cx="50" cy="62" r="4" fill={goldColor} stroke="#000" strokeWidth="1"/>
            <circle cx="50" cy="74" r="4" fill={goldColor} stroke="#000" strokeWidth="1"/>
            {/* Руки */}
            <rect x="20" y="42" width="12" height="30" rx="5" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            <rect x="68" y="42" width="12" height="30" rx="5" fill={primaryColor} stroke="#000" strokeWidth="1.5"/>
            {/* Кисти */}
            <circle cx="26" cy="75" r="6" fill={handColor} stroke="#000" strokeWidth="1"/>
            <circle cx="74" cy="75" r="6" fill={handColor} stroke="#000" strokeWidth="1"/>
            {/* Держава в руке */}
            <circle cx="74" cy="68" r="8" fill={goldColor} stroke="#000" strokeWidth="1.5"/>
            <line x1="74" y1="76" x2="74" y2="85" stroke={goldColor} strokeWidth="3"/>
            {/* Крест на державе */}
            <line x1="70" y1="72" x2="78" y2="72" stroke="#000" strokeWidth="2"/>
            <line x1="74" y1="68" x2="74" y2="76" stroke="#000" strokeWidth="2"/>
            {/* Ноги */}
            <rect x="38" y="90" width="10" height="18" rx="3" fill={secondaryColor} stroke="#000" strokeWidth="1"/>
            <rect x="52" y="90" width="10" height="18" rx="3" fill={secondaryColor} stroke="#000" strokeWidth="1"/>
            {/* Ботинки */}
            <rect x="36" y="106" width="14" height="10" rx="2" fill={goldColor} stroke="#000" strokeWidth="1"/>
            <rect x="50" y="106" width="14" height="10" rx="2" fill={goldColor} stroke="#000" strokeWidth="1"/>
          </svg>
        );
      
      default:
        return null;
    }
  };

  return (
    <div
      className={`chess-piece piece-${type} ${isWhite ? 'piece-white' : 'piece-black'} ${selected ? 'selected' : ''} ${isLastMove ? 'last-move' : ''} ${isCheck ? 'check' : ''}`}
    >
      {renderPiece()}
    </div>
  );
}
