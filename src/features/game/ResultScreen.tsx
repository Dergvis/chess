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
  // Определяем результат для игрока
  const getPlayerResult = () => {
    if (!result) return 'draw';
    
    if (result.winner === playerColor) {
      return 'win';
    } else if (result.winner === 'draw' || result.winner === null) {
      return 'draw';
    } else {
      return 'lose';
    }
  };

  const playerResult = getPlayerResult();

  const getResultTitle = () => {
    if (result?.reason === 'checkmate') {
      if (playerResult === 'win') return '🎉 Победа!';
      if (playerResult === 'lose') return '😢 Поражение';
    }
    if (result?.reason === 'stalemate') return '🤝 Пат!';
    return '🤝 Ничья!';
  };

  const getResultMessage = () => {
    if (playerResult === 'win') {
      return opponent?.reactions.lose[0] || 'Ты победил! Молодец!';
    } else if (playerResult === 'lose') {
      return opponent?.reactions.win[0] || 'Попробуй ещё раз!';
    } else {
      return 'Интересная партия!';
    }
  };

  const getOpponentReaction = () => {
    if (playerResult === 'win') {
      return opponent?.reactions.lose[1] || '😔';
    } else if (playerResult === 'lose') {
      return opponent?.reactions.win[1] || '😄';
    } else {
      return '🙂';
    }
  };

  return (
    <div className="result-screen">
      <div className="result-container animate-fadeIn">
        <div className="result-header">
          <div className="result-emoji">{getOpponentReaction()}</div>
          <h1 className="result-title">{getResultTitle()}</h1>
          <p className="result-message">{getResultMessage()}</p>
        </div>

        <div className="result-info">
          {result && (
            <>
              <div className="result-stat">
                <span className="stat-label">Ходов</span>
                <span className="stat-value">{result.moves}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">Причина</span>
                <span className="stat-value">
                  {result.reason === 'checkmate' ? 'Мат' : 
                   result.reason === 'stalemate' ? 'Пат' : 
                   result.reason === 'timeout' ? 'Время' : 'Ничья'}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="result-actions">
          <button className="btn btn-primary btn-large" onClick={onNewGame}>
            🔄 Сыграть ещё
          </button>
          <button className="btn btn-secondary btn-large" onClick={onHome}>
            🏠 В меню
          </button>
        </div>
      </div>
    </div>
  );
}
