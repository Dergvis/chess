import {heroConfig,heroProgression} from "./heroConfig";
import type { HeroId } from "./types";
export const weaponTier = (parts: number) =>
  Math.min(heroProgression.thresholds.length+1, Math.max(1, parts + 1));
const names: Record<HeroId, string> = {
  inventor: "laserhorse",
  mage: "ladiator",
  knight: "officer",
};
export function actorImage(id: HeroId, parts: number, attack = false) {
  const tier = weaponTier(parts);
  return tier === 1
    ? `/world-art/${names[id]}${
        id === "inventor" && attack ? "-attack" : ""
      }.png`
    : `/world-art/${names[id]}-level-${tier}.png`;
}
export const upgradedHeroes: HeroId[] = ["knight", "inventor", "mage"];
export const weaponName = Object.fromEntries(Object.entries(heroConfig).map(([id,c])=>[id,c.upgrades])) as Record<HeroId,string[]>;
// Every coordinate is normalized against the full transparent sprite, measured after asset review.
export const weaponOrigins: Record<HeroId, number[][]> = {
  knight: [
    [0.927, 0.088],
    [0.911, 0.083],
    [0.927, 0.093],
    [0.925, 0.068],
    [0.939, 0.085],
  ],
  mage: [
    [0.345, 0.117],
    [0.343, 0.085],
    [0.334, 0.112],
    [0.331, 0.13],
    [0.35, 0.12],
  ],
  inventor: [
    [0.704, 0.29],
    [0.727, 0.296],
    [0.698, 0.294],
    [0.705, 0.291],
    [0.726, 0.295],
  ],
};
export const eyeOrigins: number[][] = [
  [0.704, 0.29, 0.804, 0.293],
  [0.727, 0.296, 0.836, 0.3],
  [0.698, 0.294, 0.807, 0.304],
  [0.705, 0.291, 0.819, 0.295],
  [0.726, 0.295, 0.825, 0.297],
];
export const attackTiming = (hero: HeroId, tier: number) => ({
  aim: 380,
  charge: hero === "knight" ? 500 : 480,
  flight: hero === "knight" ? Math.max(520, 1000 - tier * 85) : 650,
  settle: 1100,
});
