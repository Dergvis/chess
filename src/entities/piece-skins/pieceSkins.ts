import type { PieceSkin, PieceType } from '../../shared/types';

/**
 * Единый набор фигур (скинов)
 * Один стиль для всех - мультяшные человечки
 */

const defaultSkin: PieceSkin = {
  id: 'default',
  title: "Standard",
  description: "Classic chess pieces",
  pieces: {
    p: {
      idle: '♟',
      selected: '♟',
      move: '♟',
      capture: '♟',
    },
    n: {
      idle: '♞',
      selected: '♞',
      move: '♞',
      capture: '♞',
    },
    b: {
      idle: '♝',
      selected: '♝',
      move: '♝',
      capture: '♝',
    },
    r: {
      idle: '♜',
      selected: '♜',
      move: '♜',
      capture: '♜',
    },
    q: {
      idle: '♛',
      selected: '♛',
      move: '♛',
      capture: '♛',
    },
    k: {
      idle: '♚',
      selected: '♚',
      move: '♚',
      capture: '♚',
    },
  },
  selectedStyle: 'glow-blue',
  reactionStyles: {
    check: 'shake',
    capture: 'bounce',
    move: 'slide',
  },
};

export const pieceSkins: PieceSkin[] = [defaultSkin];

/**
 * Получить скин по ID
 */
export function getPieceSkin(id: string): PieceSkin | undefined {
  return pieceSkins.find(s => s.id === id);
}

/**
 * Получить все скины
 */
export function getAllPieceSkins(): PieceSkin[] {
  return [...pieceSkins];
}

/**
 * Получить символ фигуры для отображения
 */
export function getPieceSymbol(
  skin: PieceSkin,
  pieceType: PieceType,
  state: 'idle' | 'selected' | 'move' | 'capture' = 'idle'
): string {
  return skin.pieces[pieceType][state];
}

export default pieceSkins;
