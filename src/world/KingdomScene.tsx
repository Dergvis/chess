import { durabilityByStage } from "./siege";
import HeroAbility from "./HeroAbility";
import { attackTiming, weaponTier } from "./weapons";
import { playWorldSound } from "./worldSound";
import { chapters, character, nextUpgrade } from "./growth";
import Badge from "./Badge";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import HeroActor from "./HeroActor";
import { forSkill, heroArt, territories } from "./catalog";
import type { HeroId, WorldSave, Challenge, Skill } from "./types";
import { soundSystem } from "../shared/lib/soundSystem";
import Puzzle from "./Puzzle";
import { castleDamage } from "./progress";

export const damageText = [
  "Four chapters to free the fortress",
  "The first crack appeared in the gates!",
  "The first gate panel is broken!",
  "The stone arch has cracked!",
  "The tower’s defenses weakened!",
  "A tower battlement has fallen!",
  "A passage opened in the wall!",
  "The gates are almost open!",
  "Fork Kingdom completed!",
];
const damageImage = (n: number) =>
  n
    ? "/world-art/damage-" + Math.min(8, n) + ".png"
    : "/world-art/courtyard.png";

export default function KingdomScene({
  hero,
  skill = "fork",
  save,
  onChallenge,
  onBack,
  onContinue,
  reward = false,
  rewardFrom = 0,
  rewardPart = null,
  pathPanel,
  onSettled,
}: {
  hero: HeroId;
  skill?: Skill;
  save: WorldSave;
  onChallenge: (c: Challenge) => void;
  onBack: () => void;
  onContinue?: () => void;
  reward?: boolean;
  rewardFrom?: number;
  rewardPart?: string | null;
  pathPanel?: ReactNode;
  onSettled?: () => void;
}) {
  const damage = castleDamage(save, skill);
  const tier = weaponTier(character(save).equippedParts.length);
  const title = territories.find((t) => t.id === skill)!.name;
  const [shownDamage, setShownDamage] = useState(reward ? rewardFrom : damage);
  const [phase, setPhase] = useState(
    reward && damage > rewardFrom ? "aim" : "idle"
  );
  const [lesson, setLesson] = useState(false);
  const [demonstration, setDemonstration] = useState(false);
  const [assetReady, setAssetReady] = useState(false);
  const all = forSkill(skill),
    next = all.find(
      (c) => !save.worldProgress.completedChallenges.includes(c.id)
    );
  const done = all.filter((c) =>
    save.worldProgress.completedChallenges.includes(c.id)
  ).length;
  const currentChapter = next?.chapter || 4;
  const [chapter, setChapter] = useState(currentChapter);
  const visible = all.filter((c) => (c.chapter || 1) === chapter);
  const replay = reward && damage === rewardFrom;
  useEffect(() => {
    let mounted = true;
    const image = new Image();
    image.src = damageImage(damage);
    image.onload = () => {
      if (mounted) setAssetReady(true);
    };
    image.onerror = () => {
      if (mounted) setAssetReady(true);
    };
    if (image.complete) setAssetReady(true);
    return () => {
      mounted = false;
    };
  }, [damage]);
  useEffect(() => {
    if (!reward || replay || !assetReady) return;
    setPhase("aim");
    const t = attackTiming(hero, tier),
      fire = t.aim + t.charge,
      impact = fire + t.flight;
    const timers = [
      setTimeout(() => {
        setPhase("charge");
        playWorldSound(
          hero === "knight"
            ? "rocketAim"
            : hero === "mage"
            ? "lightningCharge"
            : "laserCharge"
        );
      }, t.aim),
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
        setShownDamage(damage);
        playWorldSound("explosion");
      }, impact),
      setTimeout(() => {
        setPhase("settled");
        playWorldSound("castleDamage");
      }, impact + t.settle),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reward, replay, assetReady, damage, hero]);
  useEffect(() => {
    if (!lesson) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLesson(false);
        setDemonstration(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lesson]);
  const busy = reward && !replay && phase !== "settled";
  useEffect(() => {
    if (onSettled && reward && !busy) {
      const timer = setTimeout(onSettled, 1600);
      return () => clearTimeout(timer);
    }
  }, [onSettled, reward, busy]);
  return (
    <main
      className={"kingdom-scene " + (reward ? "reward-scene" : "")}
      data-castle-damage={shownDamage}
      data-attack-phase={phase}
    >
      <div className="kingdom-viewport">
        <div className="kingdom-canvas">
          <img
            className="courtyard-art"
            src="/world-art/courtyard.png"
            alt="Fork Kingdom: a stone castle with blue towers"
          />
          {shownDamage > 0 && (
            <img
              key={shownDamage}
              className="courtyard-art damage-art"
              src={damageImage(shownDamage)}
              alt={damageText[shownDamage]}
            />
          )}
          {shownDamage === 4 && (
            <img
              className="courtyard-art"
              src="/world-art/damage-3.png"
              alt=""
              style={{ clipPath: "inset(43% 25% 23% 60%)" }}
            />
          )}
          <div
            className={
              "kingdom-hero " + (reward && rewardPart ? "install-reward" : "")
            }
          >
            <HeroActor
              id={hero}
              attacking={
                phase === "aim" || phase === "charge" || phase === "fire"
              }
              celebrating={phase === "settled"}
              parts={save.characterProgress.equippedUpgrades.length}
            />
          </div>
          <i
            className="castle-hit-target"
            style={{
              left: damage <= 2 ? "63%" : damage <= 4 ? "59%" : "65%",
              top: damage <= 2 ? "60%" : damage <= 4 ? "37%" : "48%",
            }}
          />
          <div
            className="castle-flags"
            aria-label={"Completed " + done + " of " + all.length + " challenges"}
          >
            {!pathPanel &&
              visible.map((c, i) => (
                <button
                  key={c.id}
                  className={
                    "castle-flag " +
                    (save.worldProgress.completedChallenges.includes(c.id)
                      ? "done"
                      : next?.id === c.id
                      ? "active"
                      : "locked")
                  }
                  disabled={
                    busy ||
                    (!save.worldProgress.completedChallenges.includes(c.id) &&
                      next?.id !== c.id)
                  }
                  onClick={() => onChallenge(c)}
                  aria-label={
                    "Challenge " +
                    (i + 1) +
                    (save.worldProgress.completedChallenges.includes(c.id)
                      ? ", completed"
                      : "")
                  }
                >
                  {save.worldProgress.completedChallenges.includes(c.id)
                    ? "✓"
                    : i + 1}
                </button>
              ))}
          </div>
          {reward && !replay && (
            <HeroAbility hero={hero} phase={phase} tier={tier} />
          )}
        </div>
      </div>
      <header className="scene-header">
        <button onClick={onBack} disabled={busy}>
          ← World map
        </button>
        <div>
          <strong>{title}</strong>
          <span>
            {save.learning
              ? `${save.learning.paths[skill]?.completed.length || 0} / 4 stages`
              : `${done} / ${all.length} challenges`}
          </span>
        </div>
      </header>
      <section
        className={"kingdom-panel " + (busy ? "scene-busy" : "")}
        aria-live="polite"
      >
        {pathPanel && !reward ? (
          pathPanel
        ) : (
          <>
            <span className="kingdom-kicker">
              {busy
                ? "TEST YOUR HERO’S STRENGTH"
                : damage === 8
                ? "JOURNEY COMPLETE"
                : reward
                ? "A GREAT START"
                : "AT THE GATES"}
            </span>
            <h1>
              {reward
                ? busy
                  ? heroArt[hero].name + " attacks!"
                  : replay
                  ? "Another discovery!"
                  : damage === 8
                  ? "The gates are broken!"
                  : "Great hit! The fortress gates weakened"
                : title}
            </h1>
            <p>
              {busy
                ? "Watch the gates…"
                : rewardPart
                ? "A new hero part: " + rewardPart
                : damage === 8
                ? "Challenges completed. Now use this skill in a full game."
                : reward
                ? save.learning
                  ? "Chapter completed. New ways to spot and use the tactic await."
                  : `Until the next fortress stage: ${
                      visible.filter(
                        (c) =>
                          !save.worldProgress.completedChallenges.includes(c.id)
                      ).length ||
                      all.filter(
                        (c) =>
                          c.chapter === currentChapter &&
                          !save.worldProgress.completedChallenges.includes(c.id)
                      ).length
                    } challenges.`
                : territories.find((t) => t.id === skill)!.lesson}
            </p>
            {reward && (
              <div className="reward-progress" aria-live="polite">
                <strong>
                  Gate strength:{" "}
                  {durabilityByStage[Math.min(4, Math.floor(rewardFrom / 2))]}%
                  →{" "}
                  {durabilityByStage[Math.min(4, Math.floor(shownDamage / 2))]}%
                </strong>
                {!busy && (
                  <strong className="damage-burst">
                    Hit! Damage: −
                    {durabilityByStage[
                      Math.min(4, Math.floor(rewardFrom / 2))
                    ] - durabilityByStage[Math.min(4, Math.floor(damage / 2))]}
                    %
                  </strong>
                )}
                <progress
                  max={100}
                  value={
                    durabilityByStage[Math.min(4, Math.floor(shownDamage / 2))]
                  }
                />
              </div>
            )}
            {!reward && (
              <nav className="chapter-tabs" aria-label="Fortress chapters">
                {["Gates", "Tower", "Courtyard", "Guardian"].map((name, i) => (
                  <button
                    key={name}
                    aria-pressed={chapter === i + 1}
                    disabled={i + 1 > currentChapter}
                    onClick={() => setChapter(i + 1)}
                  >
                    <Badge
                      kind={
                        i === 0
                          ? "defense"
                          : i === 1
                          ? "castle"
                          : i === 2
                          ? "games"
                          : "mate"
                      }
                    />
                    <span className="checkpoint-dots">
                      {all
                        .filter((c) => c.chapter === i + 1)
                        .map((c) => (
                          <i
                            key={c.id}
                            className={
                              save.worldProgress.completedChallenges.includes(
                                c.id
                              )
                                ? "done"
                                : ""
                            }
                          />
                        ))}
                    </span>
                    <span>{name}</span>
                  </button>
                ))}
              </nav>
            )}
            {!busy && (
              <div className="kingdom-actions">
                <button
                  className="world-button"
                  onClick={() =>
                    pathPanel
                      ? damage === 8
                        ? onBack()
                        : onContinue?.()
                      : onChallenge(
                          chapter < currentChapter ? visible[0] : next || all[0]
                        )
                  }
                >
                  {pathPanel
                    ? damage === 8
                      ? "World map"
                      : "Next stage"
                    : next
                    ? reward
                      ? "Next challenge"
                      : "Start the challenge"
                    : "Repeat the challenges"}{" "}
                  →
                </button>
                {!reward && skill === "fork" && (
                  <button
                    className="lesson-secondary"
                    onClick={() => {
                      setLesson(true);
                      setDemonstration(false);
                    }}
                  >
                    What is a fork?
                  </button>
                )}
                <button className="lesson-back" onClick={onBack}>
                  Return to the map
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {lesson && (
        <div
          className="lesson-modal"
          role="dialog"
          aria-modal="true"
          aria-label="What is a fork?"
        >
          <div
            className={
              "lesson-modal-card " + (demonstration ? "show-demo" : "")
            }
          >
            <button
              className="modal-close"
              autoFocus
              onClick={() => setLesson(false)}
              aria-label="Close the explanation"
            >
              ×
            </button>
            {demonstration ? (
              <Puzzle
                key="demonstration"
                puzzle={{
                  ...all[0],
                  title: "Try it: one piece — two targets",
                }}
                onComplete={() => {}}
                onBack={() => {
                  setDemonstration(false);
                  setLesson(false);
                }}
              />
            ) : (
              <>
                <h2>One piece. Two targets.</h2>
                <div className="fork-explanation">
                  <img src="/assets/pieces/w-n.png" alt="Your knight" />
                  <span>→</span>
                  <div>
                    <img src="/assets/pieces/b-k.png" alt="Enemy king" />
                    <img src="/assets/pieces/b-r.png" alt="Enemy rook" />
                  </div>
                </div>
                <p>
                  The knight attacks the king and rook together. The king must escape, leaving the rook to capture.
                </p>
                <button
                  className="world-button"
                  onClick={() => setDemonstration(true)}
                >
                  Show it on our board →
                </button>
                <small>
                  This is an explanation. Fortress progress does not change here.
                </small>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
