import type { Color, Move, DifficultyLevel, Piece } from '../../shared/types';
import { ChessCore } from '../../entities/chess/ChessCore';
import { getDifficultyPreset } from '../../shared/config/difficulty';

/**
 * AI Adapter - адаптер для игры против ИИ
 * 
 * Как работает обдумывание хода:
 * 1. Получаем preset сложности (depth, moveDelay, etc.)
 * 2. Ждём moveDelay мс ("время на размышление")
 * 3. Генерируем все легальные ходы
 * 4. Оцениваем каждый ход по параметрам:
 *    - material: ценность взятых фигур
 *    - check/mate: шах/мат
 *    - position: позиционная оценка
 *    - tactics: тактические возможности
 * 5. Добавляем случайность на основе randomFactor
 * 6. Возвращаем лучший ход
 */
export class AIAdapter {
  private difficulty: DifficultyLevel;
  private color: Color;
  private core: ChessCore;
  private isThinking: boolean = false;

  constructor(core: ChessCore, difficulty: DifficultyLevel = 'level_1', color: Color = 'b') {
    this.core = core;
    this.difficulty = difficulty;
    this.color = color;
  }

  /**
   * Установить уровень сложности
   */
  setDifficulty(difficulty: DifficultyLevel): void {
    this.difficulty = difficulty;
  }

  /**
   * Установить цвет, за который играет ИИ
   */
  setColor(color: Color): void {
    this.color = color;
  }

  /**
   * Начать обдумывание хода
   * Возвращает Promise который разрешится через время обдумывания
   */
  async startThinking(): Promise<void> {
    this.isThinking = true;
    const preset = getDifficultyPreset(this.difficulty);
    if (!preset) return;

    // Ждём пока ИИ "думает"
    await new Promise(resolve => setTimeout(resolve, preset.engineParams.moveDelay));
    
    this.isThinking = false;
  }

  /**
   * Получить лучший ход для текущей позиции
   * 
   * Алгоритм:
   * 1. Ждём время обдумывания (moveDelay)
   * 2. Получаем все легальные ходы
   * 3. Оцениваем ходы с учётом параметров сложности
   * 4. Выбираем ход с элементом случайности
   */
  async getBestMove(): Promise<Move | null> {
    const preset = getDifficultyPreset(this.difficulty);
    if (!preset) return null;

    // "Обдумывание" хода
    await this.startThinking();

    const legalMoves = this.core.getAllLegalMoves(this.color);

    if (legalMoves.length === 0) {
      return null;
    }

    // Если depth = 1 и высокий randomFactor - просто случайный ход
    if (preset.engineParams.depth === 1 && preset.engineParams.randomFactor > 0.5) {
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      return legalMoves[randomIndex];
    }

    // С вероятностью blunderProbability делаем случайный ход (ошибка)
    if (Math.random() < preset.engineParams.blunderProbability) {
      // Выбираем случайный ход из не лучших
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      return legalMoves[randomIndex];
    }

    // Оцениваем ходы
    const evaluatedMoves = legalMoves.map(move => ({
      move,
      score: this.evaluateMove(move, preset.engineParams),
    }));

    // Сортируем по убыванию scores
    evaluatedMoves.sort((a, b) => b.score - a.score);

    // Выбираем из лучших ходов с элементом случайности
    // Чем меньше randomFactor, тем меньше ходов рассматриваем
    const topMovesCount = Math.max(
      1,
      Math.floor(evaluatedMoves.length * (1 - preset.engineParams.randomFactor))
    );
    const topMoves = evaluatedMoves.slice(0, topMovesCount);
    
    // Если tacticalAwareness высокий - предпочитаем тактические ходы
    if (preset.engineParams.tacticalAwareness > 0.5) {
      const tacticalMoves = topMoves.filter(m => 
        m.move.capturedPiece || m.move.isCheck || m.move.isPromotion
      );
      if (tacticalMoves.length > 0 && Math.random() < preset.engineParams.tacticalAwareness) {
        const selectedIndex = Math.floor(Math.random() * tacticalMoves.length);
        return tacticalMoves[selectedIndex].move;
      }
    }

    // Выбираем случайный ход из топ-N
    const selectedIndex = Math.floor(Math.random() * topMoves.length);
    return topMoves[selectedIndex].move;
  }

  /**
   * Оценить ход
   * 
   * Параметры оценки:
   * - depth: влияет на глубину просчёта
   * - positionalKnowledge: вес позиционной оценки
   * - tacticalAwareness: вес тактической оценки
   */
  private evaluateMove(move: Move, params: any): number {
    let score = 0;

    // 1. Материал за взятие (базовая оценка)
    if (move.capturedPiece) {
      score += this.getPieceValue(move.capturedPiece.type) * 10;
    }

    // 2. Шах/Мат (приоритет)
    if (move.isCheckmate) {
      score += 10000;
    } else if (move.isCheck) {
      score += 50;
    }

    // 3. Позиционная оценка (зависит от positionalKnowledge)
    if (params.positionalKnowledge > 0) {
      score += this.getPositionScore(move.to, move.piece) * params.positionalKnowledge * 10;
    }

    // 4. Тактическая оценка (зависит от tacticalAwareness)
    if (params.tacticalAwareness > 0) {
      score += this.getTacticalScore(move) * params.tacticalAwareness * 5;
    }

    // 5. Развитие фигур в дебюте
    score += this.getDevelopmentScore(move);

    // 6. Контроль центра
    score += this.getCenterControlScore(move.to);

    // 7. Безопасность короля
    score += this.getKingSafetyScore(move);

    return score;
  }

  /**
   * Получить ценность фигуры
   */
  private getPieceValue(type: string): number {
    const values: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 100,
    };
    return values[type] || 0;
  }

  /**
   * Позиционная оценка
   * - Центр доски ценнее
   * - Пешки ближе к продвижению
   * - Кони и слоны активнее в центре
   */
  private getPositionScore(square: string, piece?: Piece | null): number {
    if (!piece) return 0;

    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1]) - 1;

    // Центр доски более ценен (e4, d4, e5, d5)
    const centerFiles = [3, 4]; // d, e
    const centerRanks = [3, 4]; // 4, 5
    const isCenter = centerFiles.includes(file) && centerRanks.includes(rank);
    const centerBonus = isCenter ? 0.5 : 0;

    // Пешки ближе к продвижению
    const pawnAdvanceBonus = piece.type === 'p'
      ? (piece.color === 'w' ? rank : (7 - rank)) * 0.1
      : 0;

    // Кони и слоны любят центр
    const minorPieceCenterBonus = (piece.type === 'n' || piece.type === 'b') && isCenter
      ? 0.3
      : 0;

    // Ладьи любят открытые линии
    const rookFileBonus = piece.type === 'r' ? this.getOpenFileBonus(file) : 0;

    return centerBonus + pawnAdvanceBonus + minorPieceCenterBonus + rookFileBonus;
  }

  /**
   * Бонус за открытую линию для ладей
   */
  private getOpenFileBonus(file: number): number {
    const board = this.core.getBoard();
    let whitePawns = 0;
    let blackPawns = 0;

    for (let rank = 0; rank < 8; rank++) {
      const piece = board[rank][file];
      if (piece?.type === 'p') {
        if (piece.color === 'w') whitePawns++;
        else blackPawns++;
      }
    }

    // Открытая линия (нет пешек)
    if (whitePawns === 0 && blackPawns === 0) return 0.5;
    // Полуоткрытая линия
    if (whitePawns === 0 || blackPawns === 0) return 0.2;
    return 0;
  }

  /**
   * Тактическая оценка
   * - Вилки
   * - Связки
   * - Открытые шахы
   */
  private getTacticalScore(move: Move): number {
    let score = 0;

    // Взятие более ценной фигуры
    if (move.capturedPiece) {
      const capturedValue = this.getPieceValue(move.capturedPiece.type);
      const attackerValue = this.getPieceValue(move.piece?.type || 'p');
      
      // Выгодное взятие
      if (capturedValue > attackerValue) {
        score += (capturedValue - attackerValue) * 2;
      }
    }

    // Шах с нападением на другую фигуру
    if (move.isCheck && move.capturedPiece) {
      score += 3;
    }

    return score;
  }

  /**
   * Оценка развития фигур
   */
  private getDevelopmentScore(move: Move): number {
    let score = 0;

    // Поощряем развитие лёгких фигур в начале
    if (move.piece?.type === 'n' || move.piece?.type === 'b') {
      const rank = parseInt(move.to[1]) - 1;
      // Конь/слон на 2-3 ряд
      if ((move.piece.color === 'w' && rank >= 2 && rank <= 4) ||
          (move.piece.color === 'b' && rank >= 3 && rank <= 5)) {
        score += 2;
      }
    }

    // Поощряем рокировку
    if (move.isCastling) {
      score += 5;
    }

    // Поощряем взятие центра пешками
    if (move.piece?.type === 'p') {
      const file = move.to.charCodeAt(0) - 'a'.charCodeAt(0);
      if ([3, 4].includes(file)) { // d или e пешка
        score += 1;
      }
    }

    return score;
  }

  /**
   * Оценка контроля центра
   */
  private getCenterControlScore(square: string): number {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1]) - 1;

    // Центр (e4, d4, e5, d5)
    if ([3, 4].includes(file) && [3, 4].includes(rank)) {
      return 1;
    }
    
    // Поблизости от центра
    if ([2, 5].includes(file) && [2, 5].includes(rank)) {
      return 0.5;
    }

    return 0;
  }

  /**
   * Оценка безопасности короля
   */
  private getKingSafetyScore(move: Move): number {
    let score = 0;

    // Рокировка улучшает безопасность
    if (move.isCastling) {
      score += 3;
    }

    return score;
  }

  /**
   * Получить оценку позиции (для отображения)
   */
  getEvaluation(): number {
    const board = this.core.getBoard();
    let score = 0;

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          const value = this.getPieceValue(piece.type);
          score += piece.color === this.color ? value : -value;
        }
      }
    }

    return score;
  }

  /**
   * Проверка, думает ли ИИ сейчас
   */
  getIsThinking(): boolean {
    return this.isThinking;
  }
}

/**
 * Создать AIAdapter
 */
export function createAIAdapter(
  core: ChessCore,
  difficulty?: DifficultyLevel,
  color?: Color
): AIAdapter {
  return new AIAdapter(core, difficulty, color);
}

export default AIAdapter;
