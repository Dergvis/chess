import {observeArena} from './challenges/adaptive';
import {getSettings} from "../shared/storage/settingsStorage";
import {
  syncGrowth,
  awardAction,
  partNames,
  markDay,
  fortressState,
  character,
} from "./growth";
import { archiveGame, isGameReview } from "./gameRecord";
import { queueSave } from "./storage";
import { worldKey } from "./accountStorage";
import type {
  Analysis,
  Challenge,
  GameRecord,
  HeroId,
  Skill,
  WorldSave,
} from "./types";
import { skills, forSkill, heroArt, territories } from "./catalog";
import { emit } from "./events";
import { ensureLearning } from "./challenges/model";
export const SAVE_KEY = "gosha-world-v1";
export function castleDamage(s: WorldSave, skill: Skill = "fork") {
  return fortressState(s, skill);
}
export const newWorld = (): WorldSave =>
  syncGrowth({
    version: 1,
    player: {
      selectedCharacter: null,
      currentSkillScore: 30,
      skillBand: "beginner",
      assessedGames: 0,
    },
    mastery: Object.fromEntries(
      skills.map((s) => [
        s,
        { points: 0, practice: 0, realGame: 0, relevance: 0 },
      ])
    ) as WorldSave["mastery"],
    worldProgress: {
      location: "camp",
      completedChallenges: [],
      milestones: [],
      castleDamage: { fork: 0 },
    },
    characterProgress: {
      unlockedUpgrades: [],
      equippedUpgrades: [],
      firstWinRewardClaimed: false,
    },
    games: [],
    adaptiveOpponent: {
      currentStrength: 35,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      recentAdjustment: 0,
      results: [],
    },
  });
export function loadWorld(): WorldSave {
  try {
    const s = JSON.parse(localStorage.getItem(worldKey(SAVE_KEY)) || "null");
    if (s?.version !== 1) return newWorld();
    const base = newWorld();
    if (
      !Array.isArray(s.games) ||
      !Array.isArray(s.worldProgress?.completedChallenges) ||
      !Array.isArray(s.characterProgress?.unlockedUpgrades) ||
      !Number.isFinite(s.player?.currentSkillScore)
    )
      return base;
    return syncGrowth({
      ...base,
      ...s,
      characters: s.characters,
      achievements: s.achievements,
      mastery: { ...base.mastery, ...s.mastery },
      player: { ...base.player, ...s.player },
      adaptiveOpponent: { ...base.adaptiveOpponent, ...s.adaptiveOpponent },
      worldProgress: {
        ...s.worldProgress,
        castleDamage: { fork: castleDamage(s) },
      },
    });
  } catch {
    return newWorld();
  }
}
export function persistWorld(s: WorldSave) {
  try {
    const stored = JSON.parse(localStorage.getItem(worldKey(SAVE_KEY)) || 'null');
    // An older open tab must not put an adventure back after a reset.
    if ((stored?.restartedAt || 0) > (s.restartedAt || 0)) return false;
    syncGrowth(s);
    s.updatedAt = Date.now();
    s.settings=getSettings();
    localStorage.setItem(worldKey(SAVE_KEY), JSON.stringify(s));
    queueSave(s);
    return true;
  } catch {
    return false;
  }
}
const copy = (s: WorldSave): WorldSave => JSON.parse(JSON.stringify(s));
export function selectCharacter(s: WorldSave, id: HeroId) {
  const n = copy(s);
  syncGrowth(n);
  n.player.selectedCharacter = id;
  return syncGrowth(n);
}
export function territoryStage(s: WorldSave, skill: Skill) {
  const done = forSkill(skill).filter((c) =>
    s.worldProgress.completedChallenges.includes(c.id)
  ).length;
  const total = forSkill(skill).length;
  return done === 0
    ? 0
    : done >= total
    ? 4
    : done >= Math.ceil(total * 0.75)
    ? 3
    : done >= Math.ceil(total * 0.4)
    ? 2
    : 1;
}
export function grant(s: WorldSave, milestone: string) {
  if (s.worldProgress.milestones.includes(milestone)) return;
  s.worldProgress.milestones.push(milestone);
  emit("reward_unlocked", { milestone });
}
function mastery(
  s: WorldSave,
  skill: Skill,
  amount: number,
  source: "practice" | "realGame"
) {
  const m = s.mastery[skill];
  m[source] += amount;
  m.points = Math.min(100, m.points + amount);
  m.relevance = Math.max(0, m.relevance - 1);
  emit("mastery_progress", { skill, source, points: m.points });
}
export function completeChallenge(
  s: WorldSave,
  c: Challenge,
  result = { attempts: 1, assisted: false }
) {
  const n = copy(s);
  syncGrowth(n);
  if (n.worldProgress.completedChallenges.includes(c.id)) {
    const best = n.challengeResults![c.id];
    if (
      !best ||
      (best.assisted && !result.assisted) ||
      (best.assisted === result.assisted && result.attempts < best.attempts)
    )
      n.challengeResults![c.id] = result;
    return n;
  }
  n.worldProgress.completedChallenges.push(c.id);
  n.challengeResults![c.id] = result;
  n.achievements!.puzzlesSolved++;
  awardAction(n, "puzzles");
  n.worldProgress.castleDamage = { fork: castleDamage(n) };
  mastery(n, c.skill, Math.ceil(80 / forSkill(c.skill).length), "practice");
  emit("challenge_completed", { challenge: c.id, skill: c.skill });
  if (n.worldProgress.completedChallenges.length === 1)
    grant(n, "first-challenge");
  if (
    forSkill(c.skill).every((x) =>
      n.worldProgress.completedChallenges.includes(x.id)
    )
  ) {
    grant(n, `territory-${c.skill}`);
    awardAction(n, "skills");
    if (!n.worldProgress.milestones.includes("first-skill"))
      grant(n, "first-skill");
  }
  return syncGrowth(n);
}
export function saveGame(s: WorldSave, game: GameRecord) {
  if (s.games.some((g) => g.id === game.id)) return s;
  const n = copy(s);
  syncGrowth(n);
  game.characterId ||= n.player.selectedCharacter || "inventor";
  game = archiveGame(game);
  game.finishedAt ||= Date.now();
  const previous = character(n, game.characterId);
  const beforeSteps = previous.progress;
  game.rewards = {
    heroSteps: 0,
    skills: {},
    fromParts: previous.equippedParts.length,
    toParts: previous.equippedParts.length,
  };
  n.games.push(game);
  n.achievements!.gamesPlayed++;
  if (game.moves.length >= 2) markDay(n);
  n.games = n.games.slice(-60);
  emit("game_finished", { id: game.id, reason: game.reason });
  emit("game_result", { id: game.id, result: game.result, level: game.level });
  if (game.result === "win") {
    n.achievements!.wins++;
    n.achievements!.arenaWins++;
    awardAction(n, "wins", 1, game.characterId);
    if (!n.characterProgress.firstWinRewardClaimed) {
      n.characterProgress.firstWinRewardClaimed = true;
      grant(n, "first-win");
      emit("first_win", { id: game.id });
    }
    const wins = n.games.filter((g) => g.result === "win").length;
    if (wins === 3) grant(n, "three-wins");
    if (wins === 10) grant(n, "ten-wins");
  } else if (game.result !== "quit" && game.moves.length > 0) {
    awardAction(n, "games", 1, game.characterId);
  }
  game.rewards.heroSteps =
    character(n, game.characterId).progress - beforeSteps;
  game.rewards.toParts = character(n, game.characterId).equippedParts.length;
  return syncGrowth(n);
}
export function applyAnalysis(s: WorldSave, id: string, analysis: Analysis) {
  const n = copy(s),
    g = n.games.find((g) => g.id === id);
  if (!g || g.analysis) return s;
  syncGrowth(n);
  analysis = { ...analysis };
  if (analysis.review && !isGameReview(g, analysis.review))
    delete analysis.review;
  g.analysis = analysis;
  observeArena(ensureLearning(n),g,analysis.score);
  if(n.learning)ensureLearning(n).recentGameNeeds=[...new Set(n.games.slice(-3).flatMap(game=>game.analysis?.missed||[]))];
  if (g.result === "quit") return n;
  const beforeSteps = character(n, g.characterId).progress;
  g.rewards ||= {
    heroSteps: 0,
    skills: {},
    fromParts: character(n, g.characterId).equippedParts.length,
    toParts: character(n, g.characterId).equippedParts.length,
  };
  // Give credit only for motifs actually observed; never invent a skill for a loss.
  const observed = [...new Set(analysis.noticed)].filter(
    (k) => k !== "doubleAttack" || !analysis.noticed.includes("fork")
  );
  observed.forEach((skill) => {
    if (n.learning) {
      const l = ensureLearning(n),
        m = l.skills[skill];
      if (m) {
        m.realGame = Math.min(100, m.realGame + 20);
        m.recognition = Math.min(100, m.recognition + 8);
      }
    }
    const before = n.mastery[skill].points;
    const practiced = n.mastery[skill].practice > 0;
    mastery(n, skill, practiced ? 8 : 4, "realGame");
    g.rewards!.skills[skill] = n.mastery[skill].points - before;
    if (practiced) {
      awardAction(n, "applied", 1, g.characterId);
      grant(n, `applied-${skill}`);
    }
  });
  g.rewards.heroSteps += character(n, g.characterId).progress - beforeSteps;
  g.rewards.toParts = character(n, g.characterId).equippedParts.length;
  n.achievements!.forksFound += analysis.forksFound || 0;
  if (analysis.forksCaught) n.mastery.fork.relevance += 3;
  if (analysis.positions < 4) return n;
  const old = n.player.currentSkillScore,
    first = n.player.assessedGames === 0;
  const confidence = Math.min(1, analysis.positions / 16),
    weight = first ? 0.45 * confidence : 0.18 * confidence;
  n.player.currentSkillScore = Math.round(
    old + (analysis.score - old) * weight
  );
  n.player.assessedGames++;
  n.player.skillBand = [
    "beginner",
    "novice",
    "developing",
    "confident",
    "advanced",
  ][Math.min(4, Math.floor(n.player.currentSkillScore / 20))];
  analysis.missed.forEach((skill) => {
    n.mastery[skill].relevance += 3;
    emit("skill_detected", { skill, game: id, kind: "missed" });
  });
  observed.forEach((skill) =>
    emit("real_game_skill_used", { skill, game: id })
  );
  const a = n.adaptiveOpponent,
    previous = a.currentStrength;
  if (g.level === 5) {
    a.gamesPlayed++;
    a.wins += Number(g.result === "win");
    a.losses += Number(g.result === "loss");
    a.results = [...a.results, g.result].slice(-5);
  }
  const streak = a.results.slice(-3),
    struggle =
      g.level === 5 &&
      streak.length === 3 &&
      streak.every((r) => r === "loss") &&
      analysis.material < -500;
  const confident =
    g.level === 5 && streak.length === 3 && streak.every((r) => r === "win");
  const target =
    n.player.currentSkillScore + 6 + (struggle ? -8 : confident ? 5 : 0);
  a.currentStrength = Math.max(
    8,
    Math.min(
      94,
      first
        ? Math.round(target)
        : Math.round(
            previous + Math.max(-4, Math.min(4, (target - previous) * 0.25))
          )
    )
  );
  a.recentAdjustment = a.currentStrength - previous;
  if (a.recentAdjustment)
    emit("adaptive_bot_strength_changed", {
      previous,
      current: a.currentStrength,
      games: a.gamesPlayed,
    });
  return syncGrowth(n);
}
export function completeReview(s: WorldSave, id: string) {
  const n = copy(s),
    g = n.games.find((x) => x.id === id);
  if (
    !g?.analysis?.review ||
    g.reviewCompleted ||
    !isGameReview(g, g.analysis.review)
  )
    return s;
  syncGrowth(n);
  g.reviewCompleted = true;
  n.achievements!.puzzlesSolved++;
  awardAction(n, "puzzles", 1, g.characterId);
  mastery(n, g.analysis.review.skill, 8, "practice");
  emit("post_game_puzzle_completed", {
    game: id,
    skill: g.analysis.review.skill,
  });
  return syncGrowth(n);
}
export function recommend(s: WorldSave) {
  const ranked = skills
    .filter((skill) =>
      forSkill(skill).some(
        (c) => !s.worldProgress.completedChallenges.includes(c.id)
      )
    )
    .sort((a, b) => s.mastery[b].relevance - s.mastery[a].relevance);
  const skill = ranked[0];
  if (!skill)
    return {
      id: "arena",
      text: "First challenges completed. Use your discoveries in the Arena!",
    };
  const done = forSkill(skill).filter((c) =>
      s.worldProgress.completedChallenges.includes(c.id)
    ).length,
    total = forSkill(skill).length;
  const name = territories.find((t) => t.id === skill)!.name;
  return {
    id: skill,
    text:
      s.mastery[skill].relevance > 0
        ? `A new clue appeared in your game. Look in ${name}?`
        : `${name}: another ${Math.min(
            total - done,
            done < 1
              ? 1
              : done < Math.ceil(total * 0.4)
              ? Math.ceil(total * 0.4) - done
              : total - done
          )} challenges, and the fortress will change!`,
  };
}
export function upgradeName(s: WorldSave, index: number) {
  return partNames[s.player.selectedCharacter || "inventor"][
    Math.min(index, 3)
  ];
}
