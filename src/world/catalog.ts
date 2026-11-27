import { trainingChallenges } from "./trainingChallenges";
import type { Challenge, Skill, HeroId } from "./types";
export const skills: Skill[] = [
  "fork",
  "doubleAttack",
  "defense",
  "mate",
  "pin",
];
export const territories: {
  id: Skill | "arena";
  name: string;
  short: string;
  x: number;
  y: number;
  color: string;
  lesson: string;
}[] = [
  {
    id: "fork",
    name: "Fork Kingdom",
    short: "Fork",
    x: 245,
    y: 275,
    color: "#dc9553",
    lesson:
      "One piece attacks two targets. Your opponent saves one, leaving the other to capture!",
  },
  {
    id: "doubleAttack",
    name: "Double Attack Citadel",
    short: "Double attack",
    x: 565,
    y: 170,
    color: "#ce7964",
    lesson:
      "Make two threats with one move. For example, check the king and attack a rook.",
  },
  {
    id: "pin",
    name: "Pin Tower",
    short: "Pin",
    x: 825,
    y: 290,
    color: "#bca2d5",
    lesson:
      "A piece stands in front of its king. Moving it would expose the king to check, so it is pinned.",
  },
  {
    id: "defense",
    name: "Defense Fortress",
    short: "Defense",
    x: 710,
    y: 520,
    color: "#8cb6b0",
    lesson:
      "Find the threat. Move away, block the attack or capture the attacker.",
  },
  {
    id: "mate",
    name: "Checkmate Fortress",
    short: "Checkmate",
    x: 370,
    y: 570,
    color: "#dfbb57",
    lesson:
      "Checkmate is check with no escape. Look at every possible escape route.",
  },
  {
    id: "arena",
    name: "Opponents Arena",
    short: "Arena",
    x: 1050,
    y: 520,
    color: "#a6b77d",
    lesson: "Try your discoveries in a full game.",
  },
];
export const camp = { x: 105, y: 540 };
export const junction = { x: 505, y: 385 };
export const heroArt: Record<
  HeroId,
  {
    name: string;
    image: string;
    video: string;
    clip: string;
    origin: [number, number];
    color: string;
    ability: "laser" | "lightning" | "rocket";
    parts: string[];
  }
> = {
  inventor: {
    name: "Laserhorse",
    image: "/personas/Laserhorse.png",
    video: "/personas/laserhorsevideo.mp4",
    clip: "polygon(33% 13%,35% 13%,30% 38%,42% 26%,53% 25%,57% 33%,61% 37%,61% 43%,55% 46%,48% 43%,49% 55%,57% 55%,58% 63%,54% 73%,48% 74%,45% 87%,35% 89%,34% 78%,29% 82%,30% 86%,22% 86%,20% 81%,18% 86%,10% 87%,9% 80%,10% 67%,8% 61%,4% 52%,5% 44%,12% 41%,16% 39%,14% 35%,9% 33%,13% 28%,18% 28%,22% 31%,25% 38%,28% 37%)",
    origin: [0.492, 0.34],
    color: "#ffb348",
    ability: "laser",
    parts: [
      "Amplifier",
      "Energy core",
      "Focusing lens",
      "Mastery beam",
    ],
  },
  mage: {
    name: "Ladiator",
    image: "/personas/Ladiator.png",
    video: "/personas/Ladiator.mp4",
    clip: "polygon(25% 17%,31% 12%,36% 13%,40% 19%,38% 24%,33% 27%,34% 31%,38% 36%,45% 31%,61% 28%,66% 34%,64% 42%,70% 48%,75% 51%,77% 72%,72% 81%,65% 84%,51% 88%,44% 86%,40% 81%,36% 88%,27% 88%,23% 84%,26% 77%,11% 77%,9% 70%,18% 58%,26% 47%,30% 43%,28% 38%,28% 32%,31% 29%,29% 25%,24% 23%)",
    origin: [0.322, 0.184],
    color: "#83dfff",
    ability: "lightning",
    parts: [
      "Storm conductor",
      "Storm core",
      "Sceptre ring",
      "Mastery lightning",
    ],
  },
  knight: {
    name: "Officer Cannon",
    image: "/personas/Oficerbazuka.png",
    video: "/personas/oficerpushkavideo.mp4",
    clip: "polygon(67% 21%,73% 19%,78% 24%,75% 29%,60% 39%,61% 43%,56% 49%,49% 53%,52% 59%,56% 72%,55% 85%,48% 88%,36% 86%,34% 79%,31% 87%,21% 88%,20% 84%,25% 71%,26% 62%,22% 52%,19% 50%,19% 45%,25% 43%,22% 40%,22% 37%,34% 32%,39% 36%,44% 33%,54% 29%)",
    origin: [0.732, 0.225],
    color: "#ffcb69",
    ability: "rocket",
    parts: [
      "Stabiliser",
      "Energy charge",
      "Precision sight",
      "Mastery rocket",
    ],
  },
};
export const challenges: Challenge[] = trainingChallenges;
export const forSkill = (skill: string) =>
  challenges.filter((c) => c.skill === skill);
