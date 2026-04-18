import { useMemo, useState } from 'react';
import type { GameState, Color, Move, Piece, PieceSkin, Character, DifficultyPreset } from '../../shared/types';
import ChessPiece from './ChessPiece';
import CaptureAnimation from './CaptureAnimation';
import CheckAnimation from './CheckAnimation';
import CheckmateAnimation from './CheckmateAnimation';
import { animationEngine } from '../../config/animationEngine';
import { soundSystem } from '../../shared/lib/soundSystem';
import './GameScreen.css';

interface GameScreenProps {
  gameState: GameState | null;
  playerColor: Color;
  opponent: Character | undefined;
  pieceSkin: PieceSkin | undefined;
  difficulty: DifficultyPreset | undefined;
  selectedSquare: string | null;
  legalMoves: Move[];
  onSelectSquare: (square: string) => void;
  onMakeMove: (to: string) => void;
  onCancelSelection: () => void;
  onResign: () => void;
  isEngineTurn: boolean;
}

interface CaptureAnimationState {
  active: boolean;
  type: string;
  fromFile: number;
  fromRank: number;
  toFile: number;
  toRank: number;
}

interface CheckAnimationState {
  active: boolean;
}

interface CheckmateAnimationState {
  active: boolean;
  winner: Color;
}

export default function GameScreen({
  gameState,
  playerColor,
  opponent,
  pieceSkin,
  difficulty,
  selectedSquare,
  legalMoves,
  onSelectSquare,
  onMakeMove,
  onCancelSelection,
  onResign,
  isEngineTurn,
}: GameScreenProps) {
  const [captureAnimation, setCaptureAnimation] = useState<CaptureAnimationState | null>(null);
  const [checkAnimation, setCheckAnimation] = useState<CheckAnimationState | null>(null);
  const [checkmateAnimation, setCheckmateAnimation] = useState<CheckmateAnimationState | null>(null);

  // Преобразуем board в удобный формат
  const board = useMemo(() => {
    if (!gameState) return null;
    
    // Получаем доску из FEN
    const fenParts = gameState.fen.split(' ');
    const boardStr = fenParts[0];
    
    const board: (Piece | null)[][] = [];
    const rows = boardStr.split('/');
    
    for (const row of rows) {
      const boardRow: (Piece | null)[] = [];
      for (const char of row) {
        if (/\d/.test(char)) {
          // Пустые клетки
          for (let i = 0; i < parseInt(char); i++) {
            boardRow.push(null);
          }
        } else {
          // Фигуры
          const color = char === char.toUpperCase() ? 'w' : 'b';
          const type = char.toLowerCase() as Piece['type'];
          boardRow.push({ type, color });
        }
      }
      board.push(boardRow);
    }
    
    return board;
  }, [gameState]);

  // Получаем возможные ходы для подсветки
  const possibleMoves = useMemo(() => {
    return new Set(legalMoves.map(m => m.to));
  }, [legalMoves]);

  const captureMoves = useMemo(() => {
    return new Set(legalMoves.filter(m => m.capturedPiece).map(m => m.to));
  }, [legalMoves]);

  if (!board || !pieceSkin || !opponent || !difficulty) {
    return <div className="game-screen">Загрузка...</div>;
  }

  const isPlayerTurn = gameState?.turn === playerColor;
  const lastMove = gameState && gameState.moves.length > 0 ? gameState.moves[gameState.moves.length - 1] : null;

  // Рендер фигуры с использованием нового компонента
  const renderPiece = (piece: Piece | null, rank: number, file: number) => {
    if (!piece) return null;

    const square = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1);
    const isSelected = selectedSquare === square;
    const isPossibleMove = possibleMoves.has(square);
    const isCapture = captureMoves.has(square);
    const isLastMoveFrom = lastMove?.from === square;
    const isLastMoveTo = lastMove?.to === square;
    const isCheck = piece.type === 'k' && piece.color === gameState?.turn && gameState?.isCheck;

    return (
      <div
        key={square}
        className={`square ${isPossibleMove ? 'possible-move' : ''} ${isCapture ? 'capture-move' : ''} ${isLastMoveFrom || isLastMoveTo ? 'last-move' : ''} ${isCheck ? 'check' : ''}`}
      >
        {isPossibleMove && !isCapture && <span className="move-hint" />}
        {isCapture && <span className="capture-hint" />}
        <ChessPiece
          type={piece.type}
          color={piece.color}
          selected={isSelected}
          isLastMove={isLastMoveFrom || isLastMoveTo}
          isCheck={isCheck}
        />
      </div>
    );
  };

  const handleSquareClick = (square: string, piece: Piece | null, rank: number, file: number) => {
    console.log('=== HANDLE SQUARE CLICK ===');
    console.log('Square:', square);
    console.log('Piece:', piece);
    console.log('SelectedSquare:', selectedSquare);
    console.log('IsEngineTurn:', isEngineTurn);
    console.log('IsPlayerTurn:', isPlayerTurn);
    console.log('PossibleMoves:', Array.from(possibleMoves));
    
    if (isEngineTurn || !isPlayerTurn) {
      console.log('❌ RETURN: Not player turn or engine turn');
      return;
    }

    // Если уже выбрана фигура и кликнули на возможный ход
    if (selectedSquare && possibleMoves.has(square)) {
      console.log('✅ VALID MOVE CLICKED');
      const capturingMove = legalMoves.find(m => m.to === square);
      console.log('CapturingMove:', capturingMove);
      
      if (capturingMove?.capturedPiece) {
        console.log('🎯 CAPTURE MOVE!');
        // Запускаем анимацию взятия через animationEngine
        const animation = animationEngine.getAnimationForEvent('MOVE_CAPTURE', opponent?.preferredAnimationFlavor as any);
        const lastMove = gameState && gameState.moves.length > 0 ? gameState.moves[gameState.moves.length - 1] : null;
        const fromFile = lastMove?.to ? lastMove.to.charCodeAt(0) - 'a'.charCodeAt(0) : file;
        const fromRank = lastMove?.to ? parseInt(lastMove.to[1]) - 1 : rank;

        setCaptureAnimation({
          active: true,
          type: animation?.id || 'catapult',
          fromFile,
          fromRank,
          toFile: file,
          toRank: rank,
        });
        // Звук взятия
        soundSystem.play('capture');
      } else {
        console.log('📍 NORMAL MOVE');
        // Звук обычного хода
        soundSystem.play('move');
      }

      // Проверяем, будет ли шах или мат после хода
      const tempMove = legalMoves.find(m => m.to === square);
      if (tempMove?.isCheckmate) {
        setCheckmateAnimation({
          active: true,
          winner: playerColor,
        });
        // Звук мата
        soundSystem.play('checkmate');
      } else if (tempMove?.isCheck) {
        setCheckAnimation({
          active: true,
        });
        // Звук шаха
        soundSystem.play('check');
      }

      console.log('🚀 Calling onMakeMove(', square, ')');
      onMakeMove(square);
      return;
    }

    // Если кликнули на свою фигуру
    if (piece && piece.color === playerColor) {
      console.log('🎯 OWN PIECE CLICKED - SELECTING');
      onSelectSquare(square);
    } else {
      console.log('❌ EMPTY SQUARE OR ENEMY - CANCELING');
      onCancelSelection();
    }
  };

  const getTurnText = () => {
    if (gameState?.isCheckmate) return 'Мат!';
    if (gameState?.isStalemate) return 'Пат!';
    if (gameState?.isDraw) return 'Ничья!';
    if (gameState?.isCheck) return 'Шах!';
    return isPlayerTurn ? 'Твой ход' : `Ходит ${opponent.name}`;
  };

  return (
    <div className="game-screen">
      <div className="game-container">
        {/* Верхняя панель - соперник */}
        <div className="opponent-panel">
          <div className="opponent-info">
            <span className="opponent-avatar">{opponent.avatar}</span>
            <div className="opponent-details">
              <h3 className="opponent-name-text">{opponent.name}</h3>
              <p className="difficulty-text">{difficulty.displayName}</p>
            </div>
          </div>
          <div className="captured-pieces">
            {gameState?.capturedPieces.b.map((piece, i) => (
              <span key={i} className="captured-piece captured-white">
                {pieceSkin.pieces[piece].idle}
              </span>
            ))}
          </div>
        </div>

        {/* Доска */}
        <div className="board-container">
          <div className="board-wrapper">
            {board.map((row, rankIndex) => {
              const rank = 7 - rankIndex; // Переворачиваем для правильного отображения
              return (
                <div key={rank} className="board-row">
                  {rankIndex === 3 && (
                    <div className="rank-label">{rank + 1}</div>
                  )}
                  {row.map((piece, file) => {
                    const isLight = (rank + file) % 2 === 0;
                    const square = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1);
                    return (
                      <div
                        key={file}
                        className={`square-container ${isLight ? 'square-light' : 'square-dark'}`}
                        onClick={() => handleSquareClick(square, piece, rank, file)}
                      >
                        {renderPiece(piece, rank, file)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {/* Буквы под доской */}
            <div className="file-labels">
              {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(f => (
                <span key={f} className="file-label">{f}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Нижняя панель - игрок */}
        <div className="player-panel">
          <div className="player-info">
            <div className="turn-indicator">
              <span className={`turn-dot ${isPlayerTurn ? 'active' : ''}`} />
              <span className="turn-text">{getTurnText()}</span>
            </div>
          </div>
          <div className="captured-pieces">
            {gameState?.capturedPieces.w.map((piece, i) => (
              <span key={i} className="captured-piece captured-black">
                {pieceSkin.pieces[piece].idle}
              </span>
            ))}
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="game-controls">
          <button className="btn btn-secondary" onClick={onResign}>
            Сдаться
          </button>
          {selectedSquare && (
            <button className="btn btn-primary" onClick={onCancelSelection}>
              Отмена
            </button>
          )}
        </div>
      </div>

      {/* Анимация взятия */}
      {captureAnimation?.active && (
        <CaptureAnimation
          animationType={captureAnimation.type}
          fromFile={captureAnimation.fromFile}
          fromRank={captureAnimation.fromRank}
          toFile={captureAnimation.toFile}
          toRank={captureAnimation.toRank}
          intensity="full"
          onComplete={() => setCaptureAnimation(null)}
        />
      )}

      {/* Анимация шаха */}
      {checkAnimation?.active && (
        <CheckAnimation
          intensity="full"
          onComplete={() => setCheckAnimation(null)}
        />
      )}

      {/* Анимация мата */}
      {checkmateAnimation?.active && (
        <CheckmateAnimation
          winner={checkmateAnimation.winner}
          intensity="full"
          onComplete={() => setCheckmateAnimation(null)}
        />
      )}
    </div>
  );
}
