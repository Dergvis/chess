export type ChallengeType =
  | "MOVE"
  | "CHOOSE_SQUARE"
  | "CHOOSE_MOVE"
  | "FIND_THREAT"
  | "DEFEND"
  | "FIND_TARGET"
  | "MULTI_STEP"
  | "MINI_GAME"
  | "BOSS"
  | "MIXED"
  | "PERSONAL_GAME";
export type Goal =
  | { kind: "move" }
  | { kind: "targets"; squares: string[]; source: string }
  | {
      kind: "material";
      gain: number;
      minMoves: number;
      maxMoves: number;
      requireFork?: boolean;
      requireObjective?: Objective;
    }
  | { kind: "promotion"; minMoves: number; maxMoves: number }
  | { kind: "mate"; minMoves: number; maxMoves: number }
  | { kind: "survive"; minMoves: number; maxMoves: number; maxLoss: number };
export type Objective =
  | { kind: "mate"; moves: number }
  | { kind: "fork" | "doubleAttack" | "pin" | "unpin" | "exploitPin" | "discovered" }
  | { kind: "defendMate" | "defendFork" | "defendDouble" | "defendPin" | "escapeCheck" }
  | { kind: "save"; square: string }
  | { kind: "capture"; square?: string }
  | { kind: "best" };
export type TaskType = 'demo_mate'|'recognize_mate'|'mate_in_one'|'finish_mating_attack'|'demo_fork'|'find_fork'|'fork_in_one'|'fork_then_capture'|'find_pin'|'use_pin'|'win_piece'|'defend_piece'|'escape_check'|'recognize_targets'|'double_attack'|'promote_pawn'|'hold_position';
export interface Exercise {
  taskType?: TaskType;
  difficultyTier?: number;
  solutionDepth?: number;
  recognitionRequired?: boolean;
  mixedTheme?: boolean;
  reviewStatus?: 'ready'|'needing-review';
  reviewReason?: string;
  id: string;
  family: string;
  skill: string;
  type: ChallengeType;
  difficulty: number;
  chapter: number;
  fen: string;
  player: "w" | "b";
  solutions: string[];
  prompt: string;
  explanation: string;
  goal: Goal;
  choices?: string[];
  source?: string;
  hidden?: boolean;
  tags: string[];
  line?: string[];
  gameId?: string;
  ply?: number;
  pathSkill?: string;
  objective?: Objective;
  scenario?: string;
  subskill?: string;
  sourceRef?: string;
  prerequisite?: string;
  scaffolding?: boolean;
}
export interface Attempt {
  difficultyTier?: number;
  solutionDepth?: number;
  id: string;
  challengeId: string;
  family: string;
  skill: string;
  type: ChallengeType;
  chapter: number;
  correct: boolean;
  attempts: number;
  elapsedMs: number;
  hintLevel: number;
  hidden: boolean;
  difficulty: number;
  depth: number;
  moves: string[];
  errors: string[];
  quality: number;
  at: number;
  mode: "path" | "mixed" | "calibration" | "checkpoint" | "personal";
  pathSkill?: string;
  subskill?: string;
  scaffolding?: boolean;
  evaluations?: {
    move: string;
    loss: number;
    depth: number;
    validated?: boolean;
  }[];
}
export interface SkillMastery {
  masteryScore?: number;
  execution: number;
  recognition: number;
  calculationDepth: number;
  hintDependency: number;
  errorRate: number;
  realGame: number;
  difficulty: number;
  samples: number;
  recent: string[];
}
export interface PathProgress {
  chapter: number;
  completed: number[];
  verified: number[];
  successes: string[];
  mechanics: string[];
  bossWins: string[];
}
export interface LearningState {
  unlockedRegions?:string[];
  chapterOneSeen?:boolean;
  adaptive?: import("./adaptive").AdaptiveState;
  journeyVersion?: 2;
  version: 1;
  calibrated: boolean;
  experience?: "new" | "some" | "confident";
  calibrationIndex: number;
  globalSkillScore: number;
  recognitionScore: number;
  calculationDepth: number;
  hintDependency: number;
  errorRate: number;
  skills: Record<string, SkillMastery>;
  paths: Record<string, PathProgress>;
  attempts: Attempt[];
  rewarded: string[];
  checkpointOffered: string[];
  recentGameNeeds?: string[];
}
