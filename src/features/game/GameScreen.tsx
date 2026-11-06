import {PAYMENTS_ENABLED} from '../../product';
import PieceGuide from '../../world/PieceGuide';
import {pieceLabel} from './pieceLabels';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { GameState, Color, Move, Piece, PieceSkin, Character, DifficultyPreset } from '../../shared/types';
import ChessPiece from './ChessPiece';
import CheckAnimation from './CheckAnimation';
import CheckmateAnimation from './CheckmateAnimation';
import BattleAnimation from '../battle/BattleAnimation';
import PromotionModal from './PromotionModal';
import { getBattleVideo, getCheckmateVideo } from '../battle/battleVideos';
import { animationEngine } from '../../config/animationEngine';
import { soundSystem } from '../../shared/lib/soundSystem';
import type { ReactNode, CSSProperties } from 'react';
import AttackGuides from '../../world/AttackGuides';
import './GameScreen.css';

// Маппинг соперников к иконкам
const OPPONENT_ICONS: Record<string, string> = {
  'bear': '/иконки/Peshka.png',
  'fox': '/иконки/Horse.png',
  'owl': '/иконки/Ladia.png',
  'lion': '/иконки/Queen.png',
  'dragon': '/иконки/King.png',
};

// Состояние анимации взятия
interface CaptureAnimationState {
  from: string;
  to: string;
  attackerType: string;
  defenderType: string;
  attackerColor: string;
  phase: 'board' | 'video' | 'done';
}

interface GameScreenProps {
  gameState: GameState | null;
  playerColor: Color;
  opponent: Character | undefined;
  pieceSkin: PieceSkin | undefined;
  difficulty: DifficultyPreset | undefined;
  selectedSquare: string | null;
  legalMoves: Move[];
  onSelectSquare: (square: string) => void;
  onMakeMove: (to: string, promotion?: 'q' | 'r' | 'b' | 'n') => void;
  onResign: () => void;
  onNavigate?: NavigateFunction;
  isEngineTurn: boolean;
  isGuest?: boolean;
  onAnimationBusyChange?: (busy: boolean) => void;
  training?: { header?: ReactNode; panel: ReactNode; targets: string[]; candidates?: string[]; source?: string; move?: {from: string; to: string}; hint?: string; onSquare?: (square:string)=>void };
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
  onResign,
  onNavigate,
  isEngineTurn,
  isGuest = false,
  onAnimationBusyChange,
  training,
}: GameScreenProps) {
  const [checkAnimation, setCheckAnimation] = useState<CheckAnimationState | null>(null);
  const [checkmateAnimation, setCheckmateAnimation] = useState<CheckmateAnimationState | null>(null);
  const [battleVideo, setBattleVideo] = useState<string | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showLockedOverlay, setShowLockedOverlay] = useState(false);

  // Состояние анимации взятия на доске
  const [captureAnim, setCaptureAnim] = useState<CaptureAnimationState | null>(null);
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!training?.header) return;
    const board = boardWrapperRef.current;
    const grid = board?.closest('.game-container') as HTMLElement | null;
    if (!board || !grid) return;
    const measure = () => {
      const rows = board.querySelectorAll('.board-row');
      const last = rows[rows.length - 1];
      if (!last) return;
      const topPadding = parseFloat(getComputedStyle(grid).paddingTop);
      grid.style.setProperty('--task-grid-height', (last.getBoundingClientRect().bottom - grid.getBoundingClientRect().top - topPadding) + 'px');
    };
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    measure();
    return () => observer.disconnect();
  }, [!!training?.header]);


  useEffect(() => {
    onAnimationBusyChange?.(!!battleVideo || !!captureAnim || !!checkmateAnimation);
  }, [battleVideo, captureAnim, checkmateAnimation, onAnimationBusyChange]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const backgroundSrc = isMobile ? '/backgrounds/backgroundforallmobile.png' : '/backgrounds/backgroundforallweb.png';

  useEffect(() => {
    if (gameState) return;

    console.warn('[GameScreen] Empty game state, returning to match setup');

    const redirect = () => {
      onNavigate?.('/match', { replace: true });
    };

    const timer = window.setTimeout(redirect, 800);

    const handleVisibilityChange = () => {
      if (!document.hidden) redirect();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameState, onNavigate]);

  // Объявляем isPlayerTurn перед useEffect чтобы не было ошибки инициализации
  const isPlayerTurn = gameState?.turn === playerColor;

  // ===== PIPELINE ВЗЯТИЙ: board-анимация → видео → следующее =====
  const videoPlayingRef = useRef<boolean>(false);
  const boardAnimatingRef = useRef<boolean>(false);
  const captureAnimRef = useRef<CaptureAnimationState | null>(null);

  // Завершает текущую анимацию взятия и запускает следующую
  const finishCaptureAnim = useCallback(() => {
    setCaptureAnim(null);
    captureAnimRef.current = null;

    // Проверяем очередь — есть ли ещё взятия?
    // Они отслеживаются через moves, но уже обработаны
    // Если video только что закончился — даём 2 сек паузу
    setTimeout(() => {
      videoPlayingRef.current = false;
    }, 2000);
  }, []);

  // Запускает video для текущего captureAnim
  const startVideoForCapture = useCallback((anim: CaptureAnimationState) => {
    // Гостям только пешки — остальные фигуры заблокированы
    if (PAYMENTS_ENABLED && isGuest && anim.attackerType !== 'p') {
      console.log('[startVideoForCapture] Locked for guest, attacker:', anim.attackerType);
      setBattleVideo(null);
      videoPlayingRef.current = false;
      setShowLockedOverlay(true);
      finishCaptureAnim();
      return;
    }

    const key = `${anim.attackerColor}_${anim.attackerType}_vs_${anim.defenderType}`;
    console.log('[startVideoForCapture] Looking for video:', key);

    const videoSrc = getBattleVideo(
      anim.attackerColor as 'w' | 'b',
      anim.attackerType,
      anim.defenderType
    );

    console.log('[startVideoForCapture] Result:', videoSrc);

    if (videoSrc) {
      videoPlayingRef.current = true;
      setBattleVideo(videoSrc);
    } else {
      console.warn('[startVideoForCapture] No video found, skipping');
      // Видео нет — пропускаем к следующему
      finishCaptureAnim();
    }
  }, [isGuest, finishCaptureAnim]);

  // Запуск board-анимации для взятия
  const startCaptureBoardAnim = useCallback((from: string, to: string, attackerColor: string, attackerType: string, defenderType: string) => {
    if (boardAnimatingRef.current) return;
    boardAnimatingRef.current = true;

    // Звук взятия
    soundSystem.play('capture');

    const anim: CaptureAnimationState = {
      from, to,
      attackerColor, attackerType, defenderType,
      phase: 'board',
    };
    captureAnimRef.current = anim;
    setCaptureAnim(anim);

    // Тряска доски
    if (boardWrapperRef.current) {
      boardWrapperRef.current.classList.add('capture-shake');
      setTimeout(() => boardWrapperRef.current?.classList.remove('capture-shake'), 250);
    }

    // Через 300ms — запускаем видео
    setTimeout(() => {
      boardAnimatingRef.current = false;
      startVideoForCapture(anim);
    }, 300);
  }, [startVideoForCapture]);

  // Отслеживаем ВСЕ взятия (и игрока, и ИИ)
  const prevMovesCountRef = useRef<number>(0);

  useEffect(() => {
    if (!gameState || gameState.moves.length === 0) return;

    const newMovesCount = gameState.moves.length;

    // Проверяем, появился ли новый ход
    if (newMovesCount > prevMovesCountRef.current) {
      const lastMove = gameState.moves[newMovesCount - 1];

      // Это взятие?
      if (lastMove.capturedPiece && lastMove.piece) {
        console.log('[CapturePipeline] Capture detected:', {
          from: lastMove.from,
          to: lastMove.to,
          attackerColor: lastMove.piece.color,
          attackerType: lastMove.piece.type,
          defenderType: lastMove.capturedPiece.type,
        });

        // Запускаем board-анимацию → видео
        startCaptureBoardAnim(
          lastMove.from,
          lastMove.to,
          lastMove.piece.color,
          lastMove.piece.type,
          lastMove.capturedPiece.type,
        );
      }
    }

    prevMovesCountRef.current = gameState.moves.length;
  }, [gameState?.moves.length, startCaptureBoardAnim]);

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
    return (
      <div className="game-screen">
        <div style={{ padding: 24, color: '#111827' }}>
          Loading the game...
        </div>
      </div>
    );
  }

  const lastMove = gameState && gameState.moves.length > 0 ? gameState.moves[gameState.moves.length - 1] : null;

  // Определяем, какие клетки и фигуры участвуют в текущей анимации взятия
  const captureFromSquare = captureAnim?.phase === 'board' ? captureAnim.from : null;
  const captureToSquare = captureAnim?.phase === 'board' ? captureAnim.to : null;
  const isBoardAnimating = captureAnim?.phase === 'board';

  // Рендер фигуры с использованием нового компонента
  const renderPiece = (piece: Piece | null, rank: number, file: number) => {
    if (!piece && !isBoardAnimating) return null;

    const square = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1);
    const isSelected = selectedSquare === square;
    const isPossibleMove = possibleMoves.has(square);
    const isCapture = captureMoves.has(square);
    const isLastMoveFrom = lastMove?.from === square;
    const isLastMoveTo = lastMove?.to === square;
    const isCheck = piece?.type === 'k' && piece?.color === gameState?.turn && gameState?.isCheck;

    // Анимация взятия: на клетке назначения атакующая фигура прыгает
    const isCaptureImpactSquare = captureToSquare === square && isBoardAnimating;
    // Подсветка клетки-источника (где стояла фигура)
    const isCaptureFrom = captureFromSquare === square && isBoardAnimating;
    // Подсветка клетки назначения (во время видео)
    const isCaptureTo = captureAnim?.to === square && captureAnim?.phase === 'video';

    // Ghost-фигура на клетке-источнике (полупрозрачная, показывает откуда пришли)
    if (!piece && isCaptureFrom) {
      return (
        <div
          className={`square capture-from-highlight`}
        >
          <ChessPiece
            type={captureAnim!.attackerType as 'p' | 'n' | 'b' | 'r' | 'q' | 'k'}
            color={captureAnim!.attackerColor as 'w' | 'b'}
            isLastMove={false}
            isCheck={false}
            captureGhost={true}
          />
        </div>
      );
    }

    if (!piece) return null;

    return (
      <div
        key={square}
        className={`square ${isPossibleMove ? 'possible-move' : ''} ${isCapture ? 'capture-move' : ''} ${isLastMoveFrom || isLastMoveTo ? 'last-move' : ''} ${isCheck ? 'check' : ''} ${isCaptureFrom ? 'capture-from-highlight' : ''} ${isCaptureTo ? 'capture-to-highlight' : ''}`}
      >
        {isPossibleMove && !isCapture && <span className="move-hint" />}
        {isCapture && <span className="capture-hint" />}

        {/* Вспышка контакта на клетке назначения */}
        {isCaptureImpactSquare && (
          <div className="capture-impact-flash" key={`flash-${square}`} />
        )}

        {/* Звёзды при исчезновении */}
        {isCaptureImpactSquare && (
          <div className="capture-stars" key={`stars-${square}`}>
            {['✦', '✧', '⋆', '✶'].map((star, i) => (
              <span
                key={i}
                className="capture-star"
                style={{
                  top: `${30 + Math.random() * 40}%`,
                  left: `${20 + Math.random() * 60}%`,
                  ['--star-x' as string]: `${(Math.random() - 0.5) * 60}px`,
                  ['--star-y' as string]: `${(Math.random() - 0.5) * 60}px`,
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                {star}
              </span>
            ))}
          </div>
        )}

        <div className={training?.move?.to === square ? 'lesson-moving-piece' : 'original-piece-holder'} style={training?.move?.to === square ? {
          '--from-x': `${(training.move.from.charCodeAt(0) - file - 97) * (playerColor === 'w' ? 100 : -100)}%`,
          '--from-y': `${(Number(training.move.from[1]) - rank - 1) * (playerColor === 'w' ? -100 : 100)}%`,
        } as CSSProperties : undefined}>
        <ChessPiece
          type={piece.type}
          color={piece.color}
          selected={isSelected}
          isLastMove={isLastMoveFrom || isLastMoveTo}
          isCheck={isCheck}
          captureAttacker={isCaptureImpactSquare}
          captureTarget={false}
        />
        </div>
      </div>
    );
  };

  const handleSquareClick = (square: string, piece: Piece | null, rank: number, file: number) => {
    if (training?.onSquare) { training.onSquare(square); return; }
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

    // Если кликнули на свою фигуру — выбираем её (перевыбор если уже выбрана другая)
    if (piece && piece.color === playerColor) {
      console.log('🎯 OWN PIECE CLICKED - SELECTING');
      onSelectSquare(square);
      return;
    }

    // Если уже выбрана фигура и кликнули на возможный ход
    if (selectedSquare && possibleMoves.has(square)) {
      console.log('✅ VALID MOVE CLICKED');
      const capturingMove = legalMoves.find(m => m.to === square);
      console.log('CapturingMove:', capturingMove);

      if (capturingMove?.capturedPiece) {
        console.log('🎯 CAPTURE MOVE!');
        // Звук и анимация запустятся автоматически через useEffect при обновлении gameState
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

      // Проверяем, является ли ход превращением пешки
      const isPromotion = tempMove?.isPromotion;
      if (isPromotion) {
        // Показываем модальное окно выбора фигуры
        setPromotionPending({ from: selectedSquare!, to: square });
        return;
      }

      console.log('🚀 Calling onMakeMove(', square, ')');
      onMakeMove(square);
      return;
    }

    // Клик на пустую или вражескую (не ход) — ничего не делаем
  };

  const handlePromotionSelect = (pieceType: 'q' | 'r' | 'b' | 'n') => {
    if (promotionPending) {
      console.log('🎯 PROMOTION: Selected', pieceType);
      // Звук превращения
      soundSystem.play('promotion');
      // Делаем ход с превращением
      onMakeMove(promotionPending.to, pieceType);
      setPromotionPending(null);
    }
  };

  const getTurnText = () => {
    if (gameState?.isCheckmate) return "Checkmate!";
    if (gameState?.isStalemate) return "Stalemate!";
    if (gameState?.isDraw) return "A draw!";
    if (gameState?.isCheck) return "Check!";
    return isPlayerTurn ? "Your move" : `To move: ${opponent.name}`;
  };

  return (
    <div className="game-screen" data-page="6">
      <img
        src={backgroundSrc}
        alt="Game Background"
        className="game-background"
      />
      <div className="game-overlay" />
      <div className={"game-container"+(training?.header?" task-layout":"")}>
        {training?.header}
        {/* Левая часть - только доска */}
        <div className="game-board-section">
          {/* Доска */}
          <div className="board-container">
            <div className="board-wrapper" ref={boardWrapperRef}>
              {(() => {
                // board[0] = 8 ряд (чёрные), board[7] = 1 ряд (белые)
                // Для белых: отображаем board[0]..board[7] → ряды 8,7,6,5,4,3,2,1 (белые снизу)
                // Для чёрных: отображаем board[7]..board[0] → ряды 1,2,3,4,5,6,7,8 (чёрные снизу)
                const rowsToRender = playerColor === 'b' ? [...board].reverse() : board;

                return rowsToRender.map((row, visualRowIndex) => {
                  // visualRowIndex: 0 = верхний ряд на экране
                  // Для белых: visualRow 0 = board[0] = ряд 8, visualRow 7 = board[7] = ряд 1
                  // Для чёрных: visualRow 0 = board[7] = ряд 1, visualRow 7 = board[0] = ряд 8
                  const rank = playerColor === 'b' ? visualRowIndex : 7 - visualRowIndex;

                  return (
                    <div key={rank} className="board-row">
                      {/* Метка ранга слева от доски */}
                      <div className="rank-label">{rank + 1}</div>
                      {(playerColor === 'b' ? [...row].reverse() : row).map((piece, visualFile) => {
                        const file = playerColor === 'b' ? 7 - visualFile : visualFile;
                        const isLight = (rank + file) % 2 !== 0;
                        const square = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1);
                        return (
                          <div
                            key={file}
                            data-square={square}
                            role="button"
                            aria-label={square}
                            className={`square-container ${isLight ? 'square-light' : 'square-dark'} ${training?.targets.includes(square) ? 'lesson-target' : ''} ${training?.candidates?.includes(square) ? 'lesson-candidate' : ''} ${training?.source === square ? 'lesson-source' : ''} ${training?.hint === square ? 'lesson-hinted' : ''}`}
                            onClick={(event) => {const cell=event.currentTarget;cell.parentElement?.parentElement?.querySelectorAll(".piece-tapped").forEach(e=>e.classList.remove("piece-tapped"));if(piece){cell.classList.add("piece-tapped");window.setTimeout(()=>cell.classList.remove("piece-tapped"),1800);}handleSquareClick(square, piece, rank, file);}}
                          >
                            {renderPiece(piece, rank, file)}
                            {piece && <span className="piece-name-tip">{pieceLabel(piece.type,piece.color)}</span>}
                            {training && !piece && possibleMoves.has(square) && <span className="lesson-legal-dot" />}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}
              {/* Буквы под доской */}
              <div className="file-labels">
                {(playerColor === 'b' ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']).map(f => (
                  <span key={f} className="file-label">{f}</span>
                ))}
              </div>
              {training && <AttackGuides from={training.source} targets={training.targets} />}
            </div>
          </div>
        </div>

        {/* Правая часть - меню и информация */}
        <div className="game-sidebar">
          {!training && <PieceGuide/>}
          {training?.panel}
          {/* Панель соперника */}
          {!training && <div className="opponent-panel">
            <div className="opponent-info">
              <img
                src={OPPONENT_ICONS[opponent.id] || '/иконки/Peshka.png'}
                alt={opponent.name}
                className="opponent-avatar-icon"
              />
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
          </div>}

          {/* Видео битвы */}
          {battleVideo && (
            <div className="battle-video-wrapper">
              <BattleAnimation
                videoSrc={battleVideo}
                onEnded={() => {
                  setBattleVideo(null);
                  videoPlayingRef.current = false;
                  // Завершаем анимацию взятия
                  finishCaptureAnim();
                }}
              />
            </div>
          )}

          {/* Заглушка: видео заблокировано для гостя (вместо видео в сайдбаре) */}
          {PAYMENTS_ENABLED && showLockedOverlay && (
            <div className="locked-video-inline">
              <div className="locked-icon-small">🔒</div>
              <div className="locked-title-small">Video unavailable</div>
              <div className="locked-desc-small">Only pawns are available in the free version. Subscribe to unlock the rest.</div>
              <button
                type="button"
                className="locked-btn-small"
                onClick={() => onNavigate?.('/subscribe')}
              >
                Subscribe
              </button>
            </div>
          )}

          {/* Панель игрока */}
          {!training && <div className="player-panel">
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
          </div>}

          {/* Кнопки управления */}
          {!training && <div className="game-controls">
            <button className="btn btn-secondary" onClick={onResign}>
              Resign
            </button>
          </div>}
        </div>
      </div>

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

      {/* Модальное окно превращения пешки */}
      {promotionPending && (
        <PromotionModal
          color={playerColor}
          onSelect={handlePromotionSelect}
        />
      )}
    </div>
  );
}
