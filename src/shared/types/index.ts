// Типы для шахматной логики
export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface Square {
  file: number; // 0-7 (a-h)
  rank: number; // 0-7 (1-8)
}

export interface Move {
  from: string; // e.g., 'e2'
  to: string;   // e.g., 'e4'
  promotion?: PieceType;
  flags?: string;
  piece?: Piece;
  capturedPiece?: Piece;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isCastling?: boolean;
  isEnPassant?: boolean;
  isPromotion?: boolean;
  animationHint?: AnimationType;
}

export interface GameState {
  fen: string;
  turn: Color;
  moves: Move[];
  history: string[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  capturedPieces: {
    w: PieceType[];
    b: PieceType[];
  };
}

// Типы для анимаций
export type AnimationType =
  | 'MOVE_BASIC'
  | 'MOVE_CAPTURE'
  | 'MOVE_CASTLING'
  | 'MOVE_PROMOTION'
  | 'STATE_CHECK'
  | 'STATE_CHECKMATE'
  | 'STATE_STALEMATE'
  | 'STATE_WIN'
  | 'STATE_LOSE'
  | 'STATE_HINT';

export type AnimationIntensity = 'full' | 'short' | 'minimal';

export interface AnimationEvent {
  type: AnimationType;
  payload: {
    from?: string;
    to?: string;
    piece?: Piece;
    capturedPiece?: Piece;
    winner?: Color;
  };
  priority: number;
  skippable: boolean;
}

// Типы для персонажей
export interface Character {
  id: string;
  name: string;
  avatar: string;
  theme: string;
  difficultyPreset: DifficultyLevel;
  description: string;
  reactions: CharacterReactions;
  soundPack: string;
  preferredAnimationFlavor: string;
}

export interface CharacterReactions {
  gameStart: string[];
  goodMove: string[];
  losePiece: string[];
  check: string[];
  checkmate: string[];
  win: string[];
  lose: string[];
}

// Типы для сложности
export type DifficultyLevel = 
  | 'level_1'
  | 'level_2'
  | 'level_3'
  | 'level_4'
  | 'level_5'
  | 'level_6'
  | 'level_7'
  | 'level_8'
  | 'level_9'
  | 'level_10';

export interface DifficultyPreset {
  id: DifficultyLevel;
  displayName: string;
  subtitle?: string;
  description: string;
  icon?: string;
  engineParams: {
    depth: number;
    randomFactor: number;
    moveDelay: number;
    blunderProbability: number;
    positionalKnowledge: number;
    tacticalAwareness: number;
  };
  hintEnabled: boolean;
  uiAssistEnabled: boolean;
  elo?: number;
}

// Типы для скинов фигур
export interface PieceSkin {
  id: string;
  title: string;
  description: string;
  pieces: Record<PieceType, PieceSkinAsset>;
  selectedStyle: string;
  reactionStyles: Record<string, string>;
}

export interface PieceSkinAsset {
  idle: string;
  selected: string;
  move: string;
  capture: string;
}

// Типы для настроек пользователя
export interface UserSettings {
  pieceSkinId: string;
  opponentId: string;
  difficulty: DifficultyLevel;
  animationIntensity: AnimationIntensity;
  soundEnabled: boolean;
  musicEnabled: boolean;
  voiceEnabled: boolean;
  onboardingCompleted: boolean;
  playerName: string;
  playerExperience: 'beginner' | 'intermediate' | 'advanced';
}

// Типы для состояний приложения
export type AppState = 
  | 'boot'
  | 'onboarding'
  | 'home'
  | 'match_setup'
  | 'game_ready'
  | 'player_turn'
  | 'player_piece_selected'
  | 'move_resolving'
  | 'animation_playing'
  | 'engine_turn'
  | 'game_over'
  | 'settings';

export interface GameResult {
  winner: Color | 'draw' | null;
  reason: 'checkmate' | 'stalemate' | 'timeout' | 'resign' | 'draw';
  moves: number;
  duration: number;
}
