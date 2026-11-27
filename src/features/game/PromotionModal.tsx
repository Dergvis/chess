import './PromotionModal.css';

interface PromotionModalProps {
  color: 'w' | 'b';
  onSelect: (pieceType: 'q' | 'r' | 'b' | 'n') => void;
}

export default function PromotionModal({ color, onSelect }: PromotionModalProps) {
  const isWhite = color === 'w';
  
  const pieces: { type: 'q' | 'r' | 'b' | 'n'; label: string }[] = [
    { type: 'q', label: "Queen" },
    { type: 'r', label: "Rook" },
    { type: 'b', label: "Bishop" },
    { type: 'n', label: "Knight" },
  ];

  return (
    <div className="promotion-modal-overlay">
      <div className="promotion-modal">
        <h2 className="promotion-title">Pawn promotion</h2>
        <p className="promotion-subtitle">Choose a piece:</p>
        <div className="promotion-options">
          {pieces.map(({ type, label }) => (
            <button
              key={type}
              className="promotion-option"
              onClick={() => onSelect(type)}
            >
              <div className={`promotion-piece piece-${type} ${isWhite ? 'piece-white' : 'piece-black'}`}>
                {/* Временная заглушка - потом можно заменить на ChessPiece */}
                <span className="piece-icon">
                  {type === 'q' ? '♕' : type === 'r' ? '♖' : type === 'b' ? '♗' : '♘'}
                </span>
              </div>
              <span className="piece-label">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
