import assert from "node:assert/strict";
import { RangeModel, type RangeRun } from "./model";
import { saveRangeRun } from "./progress";
import { newWorld, selectCharacter } from "../progress";
import { syncGrowth, partThresholds } from "../growth";
const shot = (level: number) => {
  const m = new RangeModel(1000, 620, level, () => 0.5);
  m.targets = [
    {
      id: 1,
      x: 700,
      y: 220,
      r: 27,
      kind: "armor",
      hp: 2,
      vx: 0,
      vy: 0,
      hit: 0,
    },
    {
      id: 2,
      x: 770,
      y: 220,
      r: 24,
      kind: "double",
      hp: 1,
      vx: 0,
      vy: 0,
      hit: 0,
    },
  ];
  m.spawnIn = 99;
  m.trigger({ x: 700, y: 220 });
  let launched = false,
    flight = 0;
  for (let i = 0; i < 250; i++) {
    m.step(0.01, () => ({ x: 200, y: 400 }));
    if (m.rocket) {
      launched = true;
      flight = m.rocket.duration;
      assert(m.targetsHit === 0, "No hit before physical impact");
    }
    if (m.phase === "impact") break;
  }
  assert(launched);
  return { m, flight };
};
const a = shot(1),
  b = shot(2),
  c = shot(3);
assert.equal(a.m.targetsHit, 0);
assert.equal(a.m.targets[0].hp, 1);
assert.equal(b.m.targetsHit, 1);
assert.equal(c.m.targetsHit, 2);
assert(c.flight < b.flight && b.flight < a.flight);
assert(c.m.score > b.m.score);
assert.equal(c.m.hitShots, 1);
assert.equal(c.m.result("x").accuracy, 100);
console.log(
  "PASS three weapon levels: armor, larger blast, multi-target score, faster physical flight and bounded accuracy"
);
const m = new RangeModel(390, 520, 1, () => 0.3);
m.time = 59.9;
m.step(0.2, () => ({ x: 100, y: 300 }));
assert(m.finished);
assert.equal(m.time, 60);
const score = m.score;
m.trigger({ x: 300, y: 200 });
m.step(10, () => ({ x: 100, y: 300 }));
assert.equal(m.score, score);
assert.equal(m.shots, 0);
console.log("PASS fixed 60-second end and no firing after the deadline");
let s = selectCharacter(newWorld(), "knight");
s.characters!.knight.actions.puzzles = partThresholds[1];
s = syncGrowth(s);
const original = structuredClone(s);
const run: RangeRun = {
  id: "range-fixture",
  hero: "knight",
  weaponLevel: 3,
  score: 3100,
  bestCombo: 5,
  targetsHit: 16,
  shots: 12,
  hitShots: 10,
  accuracy: 83,
  duration: 60,
  finishedAt: Date.now(),
  completed: true,
};
const saved = saveRangeRun(s, run);
const { miniGames, ...rest } = saved;
assert.deepEqual(rest, original);
assert.equal(miniGames!.polygon!.knight!.bestScore, 3100);
assert(miniGames!.polygon!.knight!.medals.includes("silver"));
assert.equal(
  saveRangeRun(saved, run).miniGames!.polygon!.knight!.targetsHit,
  16
);
assert.equal(
  saveRangeRun(saved, {
    ...run,
    id: "quit",
    duration: 10,
    score: 9999,
    completed: false,
  }).miniGames!.polygon!.knight!.bestScore,
  3100
);
assert.throws(() => saveRangeRun(s, { ...run, weaponLevel: 5 }));
console.log(
  "PASS cosmetic-only rewards, unchanged hero/mastery/currencies, idempotence, abandoned-run exclusion and shared weapon-state validation"
);
for (const width of [390, 1000]) {
  const counts: number[] = [];
  for (const level of [1, 5]) {
    const g = new RangeModel(width, 620, level, () => 0.5, true);
    g.targets = [];
    g.spawnGroup();
    g.targets.forEach((t) => {
      t.vx = 0;
      t.vy = 0;
    });
    g.spawnIn = 99;
    g.groupIn = 99;
    const middle = g.targets[1];
    g.trigger({ x: middle.x, y: middle.y });
    for (let i = 0; i < 300 && g.phase !== "impact"; i++)
      g.step(0.01, () => ({ x: width * 0.2, y: 450 }));
    counts.push(g.bestMultiHit);
    assert.equal(g.bestMultiHit, g.bursts[0].kills);
  }
  assert.deepEqual(
    counts,
    [1, 3],
    "same formation must demonstrate single-target versus splash on desktop AND mobile"
  );
}
const upgraded = new RangeModel(1000, 620, 5, () => 0.5, true);
upgraded.step(3.1, () => ({ x: 200, y: 400 }));
assert.equal(
  upgraded.targets.filter((t) => t.group).length,
  3,
  "upgrade round presents three accessible shields early"
);
upgraded.step(15, () => ({ x: 200, y: 400 }));
assert(upgraded.targets.some((t) => t.kind === "gold"));
upgraded.step(7, () => ({ x: 200, y: 400 }));
assert(
  !upgraded.targets.some((t) => t.kind === "gold"),
  "golden shield is temporary"
);
let multiSave = saveRangeRun(s, { ...run, id: "multi", bestMultiHit: 3 });
assert.equal(
  multiSave.miniGames!.polygon!.knight!.weaponBests![3].bestMultiHit,
  3
);
multiSave = saveRangeRun(multiSave, {
  ...run,
  id: "lower",
  score: 100,
  bestMultiHit: 1,
  targetsHit: 2,
});
assert.equal(
  multiSave.miniGames!.polygon!.knight!.weaponBests![3].bestScore,
  3100
);
assert.equal(
  multiSave.miniGames!.polygon!.knight!.weaponBests![3].bestTargetsHit,
  16
);
assert.equal(
  multiSave.miniGames!.polygon!.knight!.weaponBests![3].bestMultiHit,
  3
);
console.log(
  "PASS five-tier splash, early upgrade formation, rare timed shield and independent weapon records"
);
