import {accessConfig} from './access';
import type { WorldSave, Skill } from "./types";
import { ensureLearning } from "./challenges/model";

export const MISTY_TOPICS_REQUIRED = accessConfig.mistyLandsRequiredTopics;
export function journeyOrder(save: WorldSave): Skill[] {
  return ["mate", "pin", "fork", "doubleAttack", "defense"];
}
export function conquered(save: WorldSave, skill: string) {
  return (ensureLearning(save).paths[skill]?.completed.length || 0) >= 4;
}
export function mistyUnlocked(save: WorldSave) {
  return (
    Object.keys(ensureLearning(save).paths).filter((k) => conquered(save, k))
      .length >= MISTY_TOPICS_REQUIRED
  );
}
export function locationUnlocked(save: WorldSave, skill: string) {
  if (skill === "polygon") return true;
  if (skill === "arena")
    return (
      ensureLearning(save).experience !== "new" ||
      conquered(save, "mate") ||
      !!save.games.length ||
      !!save.journey?.legacyOpen
    );
  const order = journeyOrder(save);
  if (!order.includes(skill as Skill)) return false;
  if (conquered(save, skill)) return true;
  if (["mate", "pin", "fork"].includes(skill)) return true;
  // The first three topics form the open starting region.
  if (skill === "doubleAttack")
    return ["mate", "pin", "fork"].every((k) => conquered(save, k));
  return conquered(save, "doubleAttack");
}
export function nextLocation(save: WorldSave) {
  return (
    journeyOrder(save).find(
      (k) => locationUnlocked(save, k) && !conquered(save, k)
    ) || "arena"
  );
}
