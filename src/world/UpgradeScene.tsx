import {heroProgression} from "./heroConfig";
import { useEffect, useState } from "react";
import HeroActor from "./HeroActor";
import HeroAbility from "./HeroAbility";
import { actorImage, attackTiming, weaponName, weaponTier } from "./weapons";
import { playWorldSound } from "./worldSound";
import type { HeroId } from "./types";
import { emit } from "./events";
export default function UpgradeScene({
  hero,
  fromParts,
  toParts,
  onDone,
  onTest,
}: {
  hero: HeroId;
  fromParts: number;
  toParts: number;
  onDone: () => void;
  onTest?: () => void;
}) {
  const [phase, setPhase] = useState("loading"),
    [revealed, setRevealed] = useState(false),
    tier = weaponTier(toParts);
  useEffect(() => {
    let live = true,
      timers: ReturnType<typeof setTimeout>[] = [];
    const img = new Image();
    const run = () => {
      if (!live) return;
      setPhase("forge");
      emit("upgrade_received", { hero, tier });
      playWorldSound("upgrade");
      const t = attackTiming(hero, tier),
        begin = 1800,
        fire = begin + t.aim + t.charge,
        impact = fire + t.flight;
      timers = [
        setTimeout(() => {
          setRevealed(true);
          setPhase("reveal");
        }, 900),
        setTimeout(() => setPhase("aim"), begin),
        setTimeout(() => {
          setPhase("charge");
          playWorldSound(
            hero === "knight"
              ? "rocketAim"
              : hero === "mage"
              ? "lightningCharge"
              : "laserCharge"
          );
        }, begin + t.aim),
        setTimeout(() => {
          setPhase("fire");
          playWorldSound(
            hero === "knight"
              ? "rocketLaunch"
              : hero === "mage"
              ? "lightningFire"
              : "laserFire"
          );
        }, fire),
        setTimeout(() => {
          setPhase("impact");
          playWorldSound("explosion");
        }, impact),
        setTimeout(() => {
          setPhase("settled");
          emit("upgrade_demo_completed", { hero, tier });
        }, impact + t.settle),
      ];
    };
    img.onload = run;
    img.onerror = () => {
      if (live) setPhase("failed");
    };
    img.src = actorImage(hero, toParts);
    return () => {
      live = false;
      timers.forEach(clearTimeout);
    };
  }, [hero, toParts]);
  return (
    <main
      className={"upgrade-scene upgrade-phase-" + phase}
      data-upgrade-phase={phase}
      data-new-tier={tier}
    >
      <div className="upgrade-stage">
        <img
          className="upgrade-backdrop"
          src="/world-art/courtyard.png"
          alt=""
        />
        <div className={"upgrade-hero " + (revealed ? "new-form" : "old-form")}>
          <div className="upgrade-old" aria-hidden={revealed}>
            <HeroActor id={hero} parts={fromParts} />
          </div>
          <div className="upgrade-new" aria-hidden={!revealed}>
            <HeroActor
              id={hero}
              parts={toParts}
              attacking={["aim", "charge", "fire"].includes(phase)}
              celebrating={phase === "settled"}
            />
          </div>
          <span className="upgrade-light" />
        </div>
        <i className="castle-hit-target" style={{ left: "82%", top: "43%" }} />
        <HeroAbility hero={hero} phase={phase} tier={tier} />
      </div>
      <header className="upgrade-title">
        <span>NEW POWER-UP!</span>
        <h1>{weaponName[hero][tier - 1]}</h1>
        <p>Already equipped</p>
        {["impact", "settled"].includes(phase) && (
          <p className="upgrade-impact-score">💥 −30 strength</p>
        )}
        <div className="level-stars" aria-label={"Weapon level " + tier}>
          {Array.from({ length: heroProgression.thresholds.length+1 }, (_, i) => (
            <i key={i} className={i < tier ? "lit" : ""} />
          ))}
        </div>
      </header>
      {phase === "failed" ? (
        <button className="world-button upgrade-done" onClick={onDone}>
          Continue the adventure →
        </button>
      ) : phase === "settled" ? (
        onTest ? (
          <div className="range-upgrade-actions">
            <button className="world-button upgrade-done" onClick={onDone}>
              Continue the adventure →
            </button>
            <button className="lesson-secondary" onClick={onTest}>
              Try it in the training ground
            </button>
          </div>
        ) : (
          <button className="world-button upgrade-done" onClick={onDone}>
            Continue the adventure →
          </button>
        )
      ) : (
        <span className="upgrade-wait" role="status">
          {phase === "loading" ? "…" : phase === "forge" ? "✦" : ""}
        </span>
      )}
    </main>
  );
}
