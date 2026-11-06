import type { Color } from "../shared/types";
export type Skill = string;
export type HeroId = "inventor" | "mage" | "knight";
export type HeroState =
  | "idle"
  | "preparing_to_move"
  | "moving"
  | "arriving"
  | "attack"
  | "celebration";
export interface Challenge {
  difficulty?: number;
  objective?: "safeFork" | "safeDouble" | "newPin" | "onlyEscape" | "rescue";
  rescueSquare?: string;
  id: string;
  skill: Skill;
  title: string;
  prompt: string;
  fen: string;
  solutions: string[];
  explanation: string;
  chapter?: number;
  kind?: "move" | "square" | "choice" | "defend";
  choices?: string[];
  concept?: string;
}
export interface Review {
  gameId?: string;
  motif?: "mate" | "fork" | "pin" | "capture" | "save" | "defense";
  played?: string;
  fen: string;
  solutions: string[];
  skill: Skill;
  prompt: string;
  explanation: string;
  ply: number;
  loss: number;
}
export interface MoveRecord {
  from: string;
  to: string;
  promotion?: string;
  before: string;
  after: string;
  elapsed: number;
}
export interface GameRecord {
  finishedAt?: number;
  pgn?: string;
  positions?: string[];
  rewards?: {
    heroSteps: number;
    skills: Partial<Record<Skill, number>>;
    fromParts: number;
    toParts: number;
    upgradeClaimed?: boolean;
  };
  id: string;
  result: "win" | "loss" | "draw" | "quit";
  reason: string;
  opponent: string;
  level: number;
  playerColor: Color;
  duration: number;
  moves: MoveRecord[];
  analysis?: Analysis;
  reviewCompleted?: boolean;
  characterId?: HeroId;
}
export interface Analysis {
  score: number;
  quality: number;
  blunders: number;
  missedCaptures: number;
  hanging: number;
  checks: number;
  checkResponses: number;
  material: number;
  noticed: Skill[];
  missed: Skill[];
  review?: Review;
  positions: number;
  forksFound?: number;
  forksCaught?: number;
}
export interface WorldSave {
  personalDemosCompleted?: number;
  settings?: import("../shared/types").UserSettings;
  trainingSessions?: {id:string;at:number;topic?:string;mixed:boolean;correct:number;reward:number;maxTier?:number;independent?:number;region?:string}[];
  journey?: {
    version: 2;
    legacyOpen?: boolean;
    worldSeen?: boolean;
    mistyRevealed?: boolean;
    onboardingSeen?: boolean;
  };
  restartedAt?: number;
  miniGames?: import("./range/model").MiniGameSave;
  learning?: import("./challenges/types").LearningState;
  version: 1;
  growthVersion?: number;
  characters?: Record<HeroId, CharacterProgress>;
  achievements?: {
    gamesPlayed: number;
    wins: number;
    puzzlesSolved: number;
    skillsMastered: number;
    arenaWins: number;
    forksFound: number;
    weeklyMeaningfulDays: string[];
  };
  challengeResults?: Record<string, { attempts: number; assisted: boolean }>;
  territories?: Record<
    Skill,
    {
      progress: number;
      chapter: number;
      completedChallenges: string[];
      fortressState: number;
    }
  >;
  recommendation?: { type: string; skill: string; reason: string };
  updatedAt?: number;
  player: {
    selectedCharacter: HeroId | null;
    currentSkillScore: number;
    skillBand: string;
    assessedGames: number;
  };
  mastery: Record<
    Skill,
    { points: number; practice: number; realGame: number; relevance: number }
  >;
  worldProgress: {
    location: string;
    completedChallenges: string[];
    milestones: string[];
    castleDamage?: { fork: number };
  };
  characterProgress: {
    unlockedUpgrades: string[];
    equippedUpgrades: string[];
    firstWinRewardClaimed: boolean;
  };
  games: GameRecord[];
  adaptiveOpponent: {
    currentStrength: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    recentAdjustment: number;
    results: string[];
  };
}

export interface CharacterProgress {
  characterId: HeroId;
  level: number;
  progress: number;
  actions: {
    puzzles: number;
    wins: number;
    skills: number;
    applied: number;
    games?: number;
  };
  unlockedParts: string[];
  equippedParts: string[];
}
