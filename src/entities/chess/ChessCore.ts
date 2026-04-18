import { Chess, Move as ChessMove, Square } from 'chess.js';
import type { Color, PieceType, Move, GameState, Piece } from '../../shared/types';

/**
 * Chess Core - модуль для управления шахматной логикой
 * Полностью независим от UI и анимаций
 */
export class ChessCore {
  private chess: Chess;
  private moveHistory: Move[] = [];
  private capturedPieces: { w: PieceType[]; b: PieceType[] } = { w: [], b: [] };

  constructor(fen?: string) {
    this.chess = fen ? new Chess(fen) : new Chess();
  }

  /**
   * Получить текущее состояние игры
   */
  getState(): GameState {
    const history = this.chess.history({ verbose: true });
    
    return {
      fen: this.chess.fen(),
      turn: this.chess.turn() as Color,
      moves: this.moveHistory,
      history: history.map((m: ChessMove) => m.san),
      isCheck: this.chess.inCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw() || this.chess.isInsufficientMaterial(),
      capturedPieces: this.capturedPieces,
    };
  }

  /**
   * Сделать ход
   */
  makeMove(move: { from: string; to: string; promotion?: PieceType }): Move | null {
    try {
      const result = this.chess.move({
        from: move.from as Square,
        to: move.to as Square,
        promotion: move.promotion,
      });
      
      if (!result) {
        return null;
      }

      const capturedPiece = result.captured 
        ? { type: result.captured as PieceType, color: (result.color === 'w' ? 'b' : 'w') as Color }
        : undefined;

      const piece = this.getPieceAt(move.from);

      const typedMove: Move = {
        from: move.from,
        to: move.to,
        promotion: result.promotion as PieceType | undefined,
        flags: result.flags,
        piece: piece ?? undefined,
        capturedPiece: capturedPiece as Piece | undefined,
        isCheck: this.chess.inCheck(),
        isCheckmate: this.chess.isCheckmate(),
        isCastling: result.flags.includes('k') || result.flags.includes('q'),
        isEnPassant: result.flags.includes('e'),
        isPromotion: !!result.promotion,
        animationHint: capturedPiece ? 'MOVE_CAPTURE' : 'MOVE_BASIC',
      };

      this.moveHistory.push(typedMove);

      // Запоминаем взятые фигуры
      if (capturedPiece) {
        const capturedColor = result.color === 'w' ? 'b' : 'w';
        this.capturedPieces[capturedColor as 'w' | 'b'].push(capturedPiece.type as PieceType);
      }

      return typedMove;
    } catch (error) {
      console.error('Error making move:', error);
      return null;
    }
  }

  /**
   * Получить все легальные ходы для клетки
   */
  getLegalMoves(square: string): Move[] {
    try {
      const moves = this.chess.moves({ square: square as Square, verbose: true });
      return moves.map((m: ChessMove) => ({
        from: m.from,
        to: m.to,
        promotion: m.promotion as PieceType | undefined,
        flags: m.flags,
        piece: { type: m.piece as PieceType, color: m.color as Color },
        capturedPiece: m.captured ? { type: m.captured as PieceType, color: (m.color === 'w' ? 'b' : 'w') as Color } : undefined,
        isCheck: false,
        isCheckmate: false,
        animationHint: m.captured ? 'MOVE_CAPTURE' : 'MOVE_BASIC',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Получить все легальные ходы для стороны
   */
  getAllLegalMoves(color?: Color): Move[] {
    try {
      const moves = this.chess.moves({ verbose: true });
      return moves.map((m: ChessMove) => ({
        from: m.from,
        to: m.to,
        promotion: m.promotion as PieceType | undefined,
        flags: m.flags,
        piece: { type: m.piece as PieceType, color: m.color as Color },
        capturedPiece: m.captured ? { type: m.captured as PieceType, color: (m.color === 'w' ? 'b' : 'w') as Color } : undefined,
        isCheck: false,
        isCheckmate: false,
        animationHint: (m.captured ? 'MOVE_CAPTURE' : 'MOVE_BASIC') as 'MOVE_CAPTURE' | 'MOVE_BASIC',
      })).filter(m => {
        if (!color) return true;
        return m.piece?.color === color;
      }) as Move[];
    } catch {
      return [];
    }
  }

  /**
   * Получить фигуру на клетке
   */
  getPieceAt(square: string): Piece | null {
    const piece = this.chess.get(square as Square);
    if (!piece) return null;
    return {
      type: piece.type as PieceType,
      color: piece.color as Color,
    };
  }

  /**
   * Получить доску в виде матрицы 8x8
   */
  getBoard(): (Piece | null)[][] {
    const board = this.chess.board();
    return board.map((row: (Piece | null)[]) => 
      row.map((piece) => {
        if (!piece) return null;
        return {
          type: piece.type as PieceType,
          color: piece.color as Color,
        };
      })
    );
  }

  /**
   * Проверить, является ли ход легальным
   */
  isLegalMove(from: string, to: string, promotion?: PieceType): boolean {
    try {
      const result = this.chess.move({ from: from as Square, to: to as Square, promotion });
      if (result) {
        this.chess.undo();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Отменить последний ход
   */
  undo(): Move | null {
    const result = this.chess.undo();
    if (!result) return null;
    
    const undoneMove = this.moveHistory.pop();
    
    if (result.captured && undoneMove) {
      const capturedColor = result.color === 'w' ? 'b' : 'w';
      this.capturedPieces[capturedColor as 'w' | 'b'].pop();
    }
    
    return undoneMove || null;
  }

  /**
   * Сбросить игру к начальной позиции
   */
  reset(): void {
    this.chess.reset();
    this.moveHistory = [];
    this.capturedPieces = { w: [], b: [] };
  }

  /**
   * Загрузить позицию из FEN
   */
  loadFen(fen: string): void {
    this.chess.load(fen);
  }

  /**
   * Получить FEN текущей позиции
   */
  getFen(): string {
    return this.chess.fen();
  }

  /**
   * Получить историю ходов
   */
  getHistory(): Move[] {
    return [...this.moveHistory];
  }

  /**
   * Проверить, окончена ли игра
   */
  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  /**
   * Получить победителя (если игра окончена)
   */
  getWinner(): Color | 'draw' | null {
    if (!this.isGameOver()) return null;
    if (this.chess.isCheckmate()) {
      return this.chess.turn() === 'w' ? 'b' : 'w';
    }
    return 'draw';
  }
}

/**
 * Создать новый экземпляр ChessCore
 */
export function createChessCore(fen?: string): ChessCore {
  return new ChessCore(fen);
}
