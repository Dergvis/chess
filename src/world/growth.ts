import {heroProgression} from "./heroConfig";
import { weaponName } from "./weapons";
import type { CharacterProgress, HeroId, Skill, WorldSave } from "./types";
import { forSkill, skills, heroArt } from "./catalog";
export const plural = (n: number, one: string, few: string, many: string) =>
  n % 100 >= 11 && n % 100 <= 14
    ? many
    : n % 10 === 1
    ? one
    : n % 10 >= 2 && n % 10 <= 4
    ? few
    : many;
export const partThresholds = heroProgression.thresholds;
export const partNames = Object.fromEntries(
  Object.entries(weaponName).map(([id, names]) => [id, names.slice(1)])
) as Record<HeroId, string[]>;
export const abilities: Record<HeroId, string> = {
  inventor: "Laser gaze — two beams from the eyes.",
  mage: "A storm in the sceptre — direct the lightning.",
  knight: "Sunshine shot — launch a rocket.",
};
export const chapters = ["Gates", "Tower", "Courtyard", "Guardian"];
export const heroIds: HeroId[] = ["inventor", "mage", "knight"];
export const emptyCharacter = (id: HeroId): CharacterProgress => ({
  characterId: id,
  level: 1,
  progress: 0,
  actions: { puzzles: 0, wins: 0, skills: 0, applied: 0 },
  unlockedParts: [],
  equippedParts: [],
});
export function character(
  s: WorldSave,
  id = s.player.selectedCharacter || "inventor"
) {
  return s.characters?.[id] || emptyCharacter(id);
}
export function nextUpgrade(s: WorldSave) {
  const p = character(s),
    i = partThresholds.findIndex((n) => n > p.progress);
  return i < 0
    ? {
        index: 3,
        remaining: 0,
        name: partNames[p.characterId][3],
        text: "Every part collected! Test your strength in the Arena.",
      }
    : {
        index: i,
        remaining: partThresholds[i] - p.progress,
        name: partNames[p.characterId][i],
        text: s.learning
          ? `Until the next part — ${partThresholds[i] - p.progress} ${plural(
              partThresholds[i] - p.progress,
              "point",
              "points",
              "points"
            )}. Solve new challenges and use your discoveries in the Arena.`
          : `Solve another ${partThresholds[i] - p.progress} ${plural(
              partThresholds[i] - p.progress,
              "puzzle",
              "puzzles",
              "puzzles"
            )} — opens ${partNames[p.characterId][i].toLowerCase()}.`,
      };
}
export function markDay(s: WorldSave) {
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
  if (!s.achievements!.weeklyMeaningfulDays.includes(day))
    s.achievements!.weeklyMeaningfulDays.push(day);
}
export function weeklyDays(s: WorldSave) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return (
    s.achievements?.weeklyMeaningfulDays.filter(
      (d) => new Date(d + "T12:00:00") >= now
    ).length || 0
  );
}
export function fortressState(s: WorldSave, skill: Skill) {
  if (s.learning?.paths[skill])
    return Math.min(8, s.learning.paths[skill].completed.length * 2);
  const all = forSkill(skill),
    count = all.filter((c) =>
      s.worldProgress.completedChallenges.includes(c.id)
    ).length,
    chapterCount = Math.max(1, ...all.map((c) => c.chapter || 1));
  return Math.min(
    8,
    Math.round(
      (Math.floor((count / all.length) * chapterCount) * 8) / chapterCount
    )
  );
}
export function syncGrowth(s: WorldSave) {
  for (const skill of skills)
    s.mastery[skill] ||= { points: 0, practice: 0, realGame: 0, relevance: 0 };
  const id = s.player.selectedCharacter || "inventor";
  if (!s.characters) {
    s.characters = Object.fromEntries(
      heroIds.map((h) => [h, emptyCharacter(h)])
    ) as Record<HeroId, CharacterProgress>;
    const p = s.characters[id];
    p.actions.puzzles =
      s.worldProgress.completedChallenges.length +
      s.games.filter((g) => g.reviewCompleted).length;
    p.actions.wins = s.games.filter((g) => g.result === "win").length;
    p.actions.skills = skills.filter((k) =>
      forSkill(k).every((c) =>
        s.worldProgress.completedChallenges.includes(c.id)
      )
    ).length;
    p.actions.applied = s.games.reduce(
      (n, g) =>
        n +
        (g.analysis?.noticed.filter((k) => s.mastery[k].practice > 0).length ||
          0),
      0
    );
    // Preserve previously awarded equipment on the selected hero during migration.
    const count = Math.min(4, s.characterProgress.unlockedUpgrades.length);
    p.progress = Math.max(
      p.actions.puzzles +
        p.actions.wins * 3 +
        p.actions.skills * 2 +
        p.actions.applied * 2,
      count ? partThresholds[count - 1] : 0
    );
  }
  s.achievements ||= {
    gamesPlayed: s.games.filter((g) => g.reason !== "in-progress").length,
    wins: s.games.filter((g) => g.result === "win").length,
    arenaWins: s.games.filter((g) => g.result === "win").length,
    puzzlesSolved:
      s.worldProgress.completedChallenges.length +
      s.games.filter((g) => g.reviewCompleted).length,
    skillsMastered: 0,
    forksFound: s.games.reduce((n, g) => n + (g.analysis?.forksFound || 0), 0),
    weeklyMeaningfulDays: [],
  };
  s.challengeResults ||= {};
  for (const h of heroIds) {
    const p = (s.characters[h] ||= emptyCharacter(h));
    p.progress = Math.max(
      p.progress,
      partThresholds[Math.max(p.unlockedParts.length,p.equippedParts.length)-1] || 0,
      p.actions.puzzles +
        p.actions.wins * 3 +
        p.actions.skills * 2 +
        p.actions.applied * 2 +
        (p.actions.games || 0)
    );
    p.level = 1 + partThresholds.filter((n) => p.progress >= n).length;
    p.unlockedParts = partThresholds.flatMap((n, i) =>
      p.progress >= n ? [`${h}-${i}`] : []
    );
    p.equippedParts = [...p.unlockedParts];
  }
  const p = s.characters[id];
  s.characterProgress.unlockedUpgrades = [...p.unlockedParts];
  s.characterProgress.equippedUpgrades = [...p.equippedParts];
  s.territories = Object.fromEntries(
    skills.map((k) => {
      const all = forSkill(k),
        done = all.filter((c) =>
          s.worldProgress.completedChallenges.includes(c.id)
        );
      return [
        k,
        {
          progress: done.length,
          chapter:
            s.learning?.paths[k]?.chapter ||
            Math.min(
              Math.max(1, ...all.map((c) => c.chapter || 1)),
              all.find(
                (c) => !s.worldProgress.completedChallenges.includes(c.id)
              )?.chapter || Math.max(1, ...all.map((c) => c.chapter || 1))
            ),
          completedChallenges: done.map((c) => c.id),
          fortressState: fortressState(s, k),
        },
      ];
    })
  ) as WorldSave["territories"];
  s.achievements.skillsMastered = skills.filter(
    (k) => s.mastery[k].points >= 80
  ).length;
  const ranked = skills
    .filter((k) =>
      s.learning?.paths[k]
        ? s.learning.paths[k].completed.length < 4
        : s.territories![k].progress < forSkill(k).length
    )
    .sort((a, b) => s.mastery[b].relevance - s.mastery[a].relevance);
  const skill: string = ranked[0] || "arena";
  const review = [...s.games]
    .reverse()
    .find((g) => g.analysis?.review && !g.reviewCompleted);
  s.recommendation = review
    ? {
        type: "review",
        skill: review.analysis!.review!.skill,
        reason:
          review.analysis!.review!.skill === "fork"
            ? "There was a fork in your game. Shall we find it together?"
            : "There is a useful moment in your game. Shall we try again?",
      }
    : {
        type: "territory",
        skill,
        reason:
          skill === "arena"
            ? "Challenges completed. Use your discoveries in the Arena!"
            : s.mastery[skill as Skill].relevance > 0
            ? "Practise a tactic that appeared in your game."
            : s.learning
            ? "Continue the journey: learn, spot, use and beat the Guardian."
            : nextUpgrade(s).text,
      };
  s.growthVersion = 2;
  return s;
}
export function awardAction(
  s: WorldSave,
  kind: keyof CharacterProgress["actions"],
  amount = 1,
  hero = s.player.selectedCharacter || "inventor"
) {
  syncGrowth(s);
  s.characters![hero].actions[kind] =
    (s.characters![hero].actions[kind] || 0) + amount;
  s.characters![hero].progress +=
    amount *
    (kind === "wins" ? 3 : kind === "skills" || kind === "applied" ? 2 : 1);
  markDay(s);
  syncGrowth(s);
}
export const masteryTitle = (n: number) =>
  n >= 100
    ? "Game master"
    : n >= 80
    ? "Confident tactician"
    : n >= 40
    ? "Confident learner"
    : n > 0
    ? "First discoveries"
    : "Adventure ahead";
