import {heroProgression} from "../heroConfig";
import type {HeroId} from "../types";
export type Point = { x: number; y: number };
export type TargetKind = "swift" | "large" | "armor" | "double" | "gold";
export type Phase =
  | "idle"
  | "aim"
  | "charge"
  | "fire"
  | "projectile"
  | "impact"
  | "recovery";
export interface Target extends Point {
  id: number;
  kind: TargetKind;
  r: number;
  hp: number;
  vx: number;
  vy: number;
  hit: number;
  born?: number;
  expires?: number;
  group?: number;
}
export interface Rocket {
  from: Point;
  to: Point;
  position: Point;
  age: number;
  duration: number;
  trail: Point[];
}
export interface Burst extends Point {
  age: number;
  radius: number;
  hit: boolean;
  score: number;
  kills?: number;
  fragments?: { x: number; y: number; r: number; kind: TargetKind }[];
}
export interface RangeRun {
  id: string;
  hero: HeroId;
  weaponLevel: number;
  score: number;
  bestCombo: number;
  targetsHit: number;
  shots: number;
  hitShots: number;
  accuracy: number;
  duration: number;
  finishedAt: number;
  completed: boolean;
  bestMultiHit?: number;
  upgradeTest?: boolean;
}
export interface WeaponBest {
  bestScore: number;
  bestTargetsHit: number;
  bestMultiHit: number;
  accuracy: number;
}
export interface RangeRecord {
  bestScore: number;
  bestCombo: number;
  targetsHit: number;
  accuracy: number;
  highestWeaponLevel: number;
  byWeapon: Record<number, number>;
  weaponBests?: Record<number, WeaponBest>;
  bestMultiHit?: number;
  medals: string[];
  runs: RangeRun[];
}
export interface MiniGameSave {
  guideSeen?: Partial<Record<HeroId,boolean>>;
  polygon?: Partial<Record<"knight" | "mage" | "inventor", RangeRecord>>;
  pendingChess?: { sessionId: string; hero: string; at: number };
  pendingWeaponTest?: { hero: HeroId; level: number; at: number };
}
export const SESSION_SECONDS = heroProgression.roundSeconds;
export const weapons = [
  {
    charge: 0.35,
    recovery: 0.75,
    speed: 520,
    radius: 18,
    damage: 1,
    label: "Precision shot",
    description:
      "One rocket, one target. Hit armour twice to break through.",
  },
  {
    charge: 0.24,
    recovery: 0.5,
    speed: 680,
    radius: 25,
    damage: 2,
    label: "Target spotted!",
    description:
      "The sight shows the blast area. Charge faster and break armour in one hit.",
  },
  {
    charge: 0.18,
    recovery: 0.4,
    speed: 1080,
    radius: 64,
    damage: 3,
    label: "Powerful volley",
    description: "A fast rocket breaks a whole group. Catch targets together!",
  },
  {
    charge: 0.17,
    recovery: 0.36,
    speed: 1150,
    radius: 100,
    damage: 3,
    label: "Area strike",
    description:
      "The energy module widens the blast. Hit several targets at once!",
  },
  {
    charge: 0.16,
    recovery: 0.34,
    speed: 1200,
    radius: 140,
    damage: 4,
    label: "Solar rocket",
    description:
      "A heavy charge and a solar shock wave cover a wide area.",
  },
];
export class RangeModel {
  width: number;
  height: number;
  level: number;
  time = 0;
  phase: Phase = "idle";
  phaseTime = 0;
  aim: Point;
  score = 0;
  combo = 0;
  bestCombo = 0;
  bestMultiHit = 0;
  targetsHit = 0;
  shots = 0;
  hitShots = 0;
  finished = false;
  targets: Target[] = [];
  rocket: Rocket | null = null;
  bursts: Burst[] = [];
  serial = 0;
  spawnIn = 0;
  lastHit = 0;
  events: string[] = [];
  groupIn: number;
  goldenAt = 18;
  constructor(
    width: number,
    height: number,
    level: number,
    public rng = Math.random,
    public upgradeTest = false
  ) {
    this.width = width;
    this.height = height;
    this.level = Math.max(1, Math.min(5, level));
    this.aim = { x: width * 0.73, y: height * 0.32 };
    this.groupIn = upgradeTest ? 3 : 7;
    for (let i = 0; i < 4; i++) this.spawn(i);
  }
  get config() {
    return weapons[this.level - 1];
  }
  get scale() {
    return Math.max(0.66, Math.min(1.3, this.width / 1000));
  }
  get radius() {
    return this.config.radius * this.scale;
  }
  point(p: Point) {
    return {
      x: Math.max(this.width * 0.36, Math.min(this.width - 12, p.x)),
      y: Math.max(20, Math.min(this.height * 0.7, p.y)),
    };
  }
  setAim(p: Point) {
    this.aim = this.point(p);
    if (this.phase === "idle") this.phase = "aim";
  }
  trigger(p: Point) {
    if (this.finished || !["idle", "aim"].includes(this.phase)) return false;
    this.setAim(p);
    this.phase = "charge";
    this.phaseTime = 0;
    this.events.push("charge");
    return true;
  }
  spawn(index = this.serial) {
    const kinds: TargetKind[] = ["large", "swift", "armor"];
    const kind = kinds[index % 3],
      r = Math.max(
        this.width < 600 ? 23 : 0,
        { large: 33, swift: 23, armor: 31, double: 24, gold: 28 }[kind] *
          this.scale
      );
    const x = this.width * (0.51 + this.rng() * 0.37),
      y = this.height * (index % 2 === 0 ? 0.49 : 0.18);
    this.targets.push({
      id: ++this.serial,
      kind,
      x,
      y,
      r,
      hp: kind === "armor" ? 2 : 1,
      vx:
        (this.rng() > 0.5 ? 1 : -1) *
        (kind === "swift" ? 62 : kind === "large" ? 22 : 14) *
        this.scale,
      vy: (kind === "armor" ? -8 : 0) * this.scale,
      hit: 0,
      born: this.time,
    });
  }
  spawnGroup() {
    const gap = this.width < 600 ? 50 : 72 * this.scale,
      cx = this.width * 0.72,
      cy = this.height * 0.34,
      group = ++this.serial;
    for (let i = 0; i < 3; i++)
      this.targets.push({
        id: ++this.serial,
        kind: "double",
        x: cx + (i - 1) * gap,
        y: cy + (i === 1 ? -gap * 0.45 : gap * 0.18),
        r: Math.max(this.width < 600 ? 23 : 0, 24 * this.scale),
        hp: 1,
        vx: 14 * this.scale,
        vy: 0,
        hit: 0,
        born: this.time,
        group,
      });
    this.events.push("group");
  }
  spawnGold() {
    this.targets.push({
      id: ++this.serial,
      kind: "gold",
      x: this.width * 0.77,
      y: this.height * 0.16,
      r: Math.max(24, 27 * this.scale),
      hp: 1,
      vx: -23 * this.scale,
      vy: 0,
      hit: 0,
      born: this.time,
      expires: this.time + 6,
    });
  }
  resize(width: number, height: number) {
    const sx = width / this.width,
      sy = height / this.height;
    const scale = (p: Point) => {
      p.x *= sx;
      p.y *= sy;
    };
    this.targets.forEach(scale);
    this.bursts.forEach(scale);
    scale(this.aim);
    if (this.rocket) {
      scale(this.rocket.from);
      scale(this.rocket.to);
      scale(this.rocket.position);
      this.rocket.trail.forEach(scale);
    }
    this.width = width;
    this.height = height;
  }
  launch(origin: Point) {
    this.phase = "fire";
    this.phaseTime = 0;
    this.shots++;
    const to = { ...this.aim },
      duration = Math.max(
        0.24,
        Math.hypot(to.x - origin.x, to.y - origin.y) /
          (this.config.speed * this.scale)
      );
    this.rocket = {
      from: { ...origin },
      to,
      position: { ...origin },
      age: 0,
      duration,
      trail: [],
    };
    this.events.push("fire");
  }
  impact() {
    const r = this.rocket!;
    let kills = 0,
      touched = 0,
      score = 0;
    const fragments: NonNullable<Burst["fragments"]> = [];
    for (const t of this.targets) {
      if (Math.hypot(t.x - r.to.x, t.y - r.to.y) <= this.radius + t.r * 0.55) {
        t.hp -= this.config.damage;
        t.hit = 0.22;
        touched++;
        if (t.hp <= 0) {
          kills++;
          score += {
            swift: 150,
            large: 90,
            armor: 220,
            double: 130,
            gold: 600,
          }[t.kind];
          fragments.push({ x: t.x, y: t.y, r: t.r, kind: t.kind });
        }
      }
    }
    if (touched) {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.hitShots++;
      this.lastHit = this.time;
    } else this.combo = 0;
    score = Math.round(score * (1 + Math.min(10, this.combo) * 0.12));
    this.score += score;
    this.targetsHit += kills;
    this.bestMultiHit = Math.max(this.bestMultiHit, kills);
    this.targets = this.targets.filter((t) => t.hp > 0);
    this.bursts.push({
      ...r.to,
      age: 0,
      radius: this.radius,
      hit: touched > 0,
      score,
      kills,
      fragments,
    });
    this.rocket = null;
    this.phase = "impact";
    this.phaseTime = 0;
    this.events.push("impact");
    if (kills >= 2) this.events.push("multiHit");
  }
  step(dt: number, origin: () => Point) {
    if (this.finished) return;
    this.time = Math.min(SESSION_SECONDS, this.time + dt);
    if (this.time >= SESSION_SECONDS) {
      this.finished = true;
      this.rocket = null;
      return;
    }
    this.phaseTime += dt;
    if (this.combo && this.time - this.lastHit > 5) this.combo = 0;
    for (const t of this.targets) {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.hit = Math.max(0, t.hit - dt);
      const minX = this.width * 0.43 + t.r,
        maxX = this.width - t.r - 12,
        minY = this.height * 0.12 + t.r,
        maxY = this.height * 0.59 - t.r;
      if (t.x < minX || t.x > maxX) {
        t.x = Math.max(minX, Math.min(maxX, t.x));
        t.vx *= -1;
      }
      if (t.y < minY || t.y > maxY) {
        t.y = Math.max(minY, Math.min(maxY, t.y));
        t.vy *= -1;
      }
    }
    this.targets = this.targets.filter(
      (t) => !t.expires || t.expires > this.time
    );
    this.groupIn -= dt;
    if (this.groupIn <= 0 && !this.targets.some((t) => t.group)) {
      this.spawnGroup();
      this.groupIn = 9;
    }
    if (this.time >= this.goldenAt) {
      this.spawnGold();
      this.goldenAt += 24;
    }
    this.spawnIn -= dt;
    if (
      this.targets.filter((t) => !t.group && t.kind !== "gold").length < 4 &&
      this.spawnIn <= 0
    ) {
      this.spawn();
      this.spawnIn = 1.25;
    }
    this.bursts.forEach((b) => (b.age += dt));
    this.bursts = this.bursts.filter((b) => b.age < 1.15);
    if (this.phase === "charge" && this.phaseTime >= this.config.charge)
      this.launch(origin());
    else if (this.phase === "fire" && this.phaseTime > 0.09) {
      this.phase = "projectile";
      this.events.push("flight");
      this.phaseTime = 0;
    } else if (this.phase === "impact" && this.phaseTime > 0.28) {
      this.phase = "recovery";
      this.phaseTime = 0;
    } else if (
      this.phase === "recovery" &&
      this.phaseTime >= this.config.recovery
    ) {
      this.phase = "aim";
      this.phaseTime = 0;
    }
    if (this.rocket && this.phase !== "fire") {
      const r = this.rocket;
      r.age += dt;
      const t = Math.min(1, r.age / r.duration);
      r.position = {
        x: r.from.x + (r.to.x - r.from.x) * t,
        y:
          r.from.y +
          (r.to.y - r.from.y) * t -
          Math.sin(Math.PI * t) * 22 * this.scale,
      };
      r.trail.push({ ...r.position });
      r.trail = r.trail.slice(-26);
      if (t >= 1) this.impact();
    }
  }
  result(id: string, completed = this.finished): RangeRun {
    return {
      id,
      hero: "knight",
      weaponLevel: this.level,
      score: this.score,
      bestCombo: this.bestCombo,
      targetsHit: this.targetsHit,
      shots: this.shots,
      hitShots: this.hitShots,
      accuracy: this.shots ? Math.round((this.hitShots / this.shots) * 100) : 0,
      duration: Math.round(this.time),
      finishedAt: Date.now(),
      completed,
      bestMultiHit: this.bestMultiHit,
      upgradeTest: this.upgradeTest,
    };
  }
}
