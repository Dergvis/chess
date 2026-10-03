import {heroProgression} from "../heroConfig";
import type { WorldSave } from "../types";
import { character } from "../growth";
import { weaponTier } from "../weapons";
import type { RangeRun, RangeRecord } from "./model";
export const emptyRecord = (): RangeRecord => ({
  bestScore: 0,
  bestCombo: 0,
  targetsHit: 0,
  accuracy: 0,
  highestWeaponLevel: 0,
  byWeapon: {},
  weaponBests: {},
  bestMultiHit: 0,
  medals: [],
  runs: [],
});
export function saveRangeRun(save: WorldSave, run: RangeRun) {
  const s = structuredClone(save);
  const previous = s.miniGames?.polygon?.[run.hero];
  if (previous?.runs.some((r) => r.id === run.id)) return s;
  if (
    !Number.isInteger(run.weaponLevel) || run.weaponLevel < 1 || run.weaponLevel >
      weaponTier(character(s, run.hero).equippedParts.length) ||
    !Number.isFinite(run.score) ||
    run.score < 0 ||
    (run.completed && run.duration !== heroProgression.roundSeconds) ||
    run.duration > heroProgression.roundSeconds ||
    run.duration < 0 ||
    run.hitShots > run.shots
  )
    throw Error("Invalid range result");
  s.miniGames ||= {};
  s.miniGames.polygon ||= {};
  const record = s.miniGames.polygon[run.hero] || emptyRecord();
  if (run.completed) {
    record.bestScore = Math.max(record.bestScore, run.score);
    record.bestCombo = Math.max(record.bestCombo, run.bestCombo);
    record.targetsHit += run.targetsHit;
    record.accuracy = run.accuracy;
    record.highestWeaponLevel = Math.max(
      record.highestWeaponLevel,
      run.weaponLevel
    );
    record.byWeapon[run.weaponLevel] = Math.max(
      record.byWeapon[run.weaponLevel] || 0,
      run.score
    );
    record.weaponBests ||= {};
    const old = record.weaponBests[run.weaponLevel];
    record.weaponBests[run.weaponLevel] = {
      bestScore: Math.max(
        old?.bestScore || record.byWeapon[run.weaponLevel] || 0,
        run.score
      ),
      bestTargetsHit: Math.max(old?.bestTargetsHit || 0, run.targetsHit),
      bestMultiHit: Math.max(old?.bestMultiHit || 0, run.bestMultiHit || 0),
      accuracy: run.accuracy,
    };
    record.bestMultiHit = Math.max(
      record.bestMultiHit || 0,
      run.bestMultiHit || 0
    );
    if (s.miniGames.pendingWeaponTest?.hero === run.hero && s.miniGames.pendingWeaponTest?.level === run.weaponLevel)
      delete s.miniGames.pendingWeaponTest;
    for (const [min, medal] of [
      [8, "bronze"],
      [15, "silver"],
      [25, "gold"],
    ] as const)
      if (run.targetsHit >= min && !record.medals.includes(medal))
        record.medals.push(medal);
  }
  record.runs = [...record.runs, run].slice(-30);
  s.miniGames.polygon[run.hero] = record;
  s.miniGames.pendingChess = {
    sessionId: run.id,
    hero: run.hero,
    at: run.finishedAt,
  };
  return s;
}
