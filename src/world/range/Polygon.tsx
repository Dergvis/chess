import {canAccess,accessConfig} from "../access";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import HeroActor from "../HeroActor";
import { character } from "../growth";
import { weaponTier, weaponName, weaponOrigins } from "../weapons";
import type { WorldSave } from "../types";
import { RangeModel, SESSION_SECONDS, weapons, type RangeRun } from "./model";
import { emptyRecord, saveRangeRun } from "./progress";
import { drawRange } from "./render";
import { emit } from "../events";
import { playWorldSound } from "../worldSound";
import SoundToggle from "../SoundToggle";
import "./range.css";
export default function Polygon({
  save,
  onSave,
  onMap,
  onChess,
  onOfficer,
}: {
  save: WorldSave;
  onSave: (s: WorldSave) => void;
  onMap: () => void;
  onChess: () => void;
  onOfficer: () => void;
}) {
  const hero = save.player.selectedCharacter || "inventor",
    parts = character(save, hero).equippedParts.length,
    level = useState(()=>(canAccess("polygon",weaponTier(parts)) || (save.miniGames?.pendingWeaponTest?.hero===hero && save.miniGames.pendingWeaponTest.level===weaponTier(parts))) ? weaponTier(parts) : accessConfig.freePolygonLevel)[0],
    record = save.miniGames?.polygon?.knight || emptyRecord();
  const currentBest =
    record.weaponBests?.[level]?.bestScore ?? record.byWeapon[level] ?? 0;
  const isUpgrade =
    save.miniGames?.pendingWeaponTest?.level === level ||
    (level > 1 &&
      !record.runs.some((r) => r.weaponLevel === level && r.completed));
  const roman = ["I", "II", "III", "IV", "V"][level - 1];
  const [rounds, setRounds] = useState(0);
  const upgradeRun = useRef(false);
  const [screen, setScreen] = useState<"intro" | "play" | "result">("intro"),
    [paused, setPaused] = useState(false),
    [run, setRun] = useState<RangeRun | null>(null),
    [hud, setHud] = useState({
      time: 60,
      score: 0,
      combo: 0,
      hits: 0,
      phase: "idle",
    });
  const stage = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    actor = useRef<HTMLDivElement>(null),
    model = useRef<RangeModel | null>(null),
    session = useRef(""),
    saved = useRef(false),
    prior = useRef(currentBest),
    saveRef = useRef(save),
    onSaveRef = useRef(onSave),
    pauseRef = useRef(paused);
  saveRef.current = save;
  onSaveRef.current = onSave;
  pauseRef.current = paused;
  useEffect(() => {
    emit("mini_game_opened", { game: "polygon", hero, weaponLevel: level });
  }, [hero]);
  function finish(completed = true) {
    const m = model.current;
    if (!m || saved.current) return;
    saved.current = true;
    const result = m.result(session.current, completed);
    m.finished = true;
    const r = saveRef.current.miniGames?.polygon?.knight;
    const before =
      r?.weaponBests?.[level]?.bestScore ?? r?.byWeapon[level] ?? 0;
    const next = saveRangeRun(saveRef.current, result);
    onSaveRef.current(next);
    setRun(result);
    setScreen("result");
    if (completed) {
      setRounds((n) => n + 1);
      if (result.score > before) playWorldSound("newRecord");
    }
    emit("mini_game_finished", { game: "polygon", ...result });
    if (completed && result.score > before)
      emit("new_personal_record", {
        game: "polygon",
        hero: "knight",
        score: result.score,
        previous: before,
        weaponLevel: result.weaponLevel,
      });
  }
  const finishRef = useRef(finish);
  finishRef.current = finish;
  function start() {
    session.current = crypto.randomUUID();
    saved.current = false;
    prior.current = currentBest;
    upgradeRun.current = isUpgrade;
    setRun(null);
    setPaused(false);
    setScreen("play");
    emit("mini_game_started", {
      game: "polygon",
      hero,
      weaponLevel: level,
      sessionId: session.current,
    });
    emit("weapon_tested", {
      game: "polygon",
      hero,
      weaponLevel: level,
      previousBest: currentBest,
      sessionId: session.current,
    });
  }
  function back() {
    if (screen === "play") finish(false);
    emit("mini_game_return_to_map", {
      game: "polygon",
      hero,
      sessionId: session.current || undefined,
    });
    onMap();
  }
  useEffect(() => {
    if (screen !== "play") return;
    const el = stage.current!,
      cv = canvas.current!,
      ctx = cv.getContext("2d");
    if (!ctx) return;
    const bounds = el.getBoundingClientRect();
    const m = new RangeModel(
      bounds.width,
      bounds.height,
      level,
      Math.random,
      upgradeRun.current
    );
    model.current = m;
    let raf = 0,
      last = performance.now(),
      lastHud = 0;
    function origin() {
      const box = el.getBoundingClientRect(),
        anchor = actor.current
          ?.querySelector(".weapon-anchor")
          ?.getBoundingClientRect();
      return anchor
        ? {
            x: anchor.left + anchor.width / 2 - box.left,
            y: anchor.top + anchor.height / 2 - box.top,
          }
        : { x: m.width * 0.22, y: m.height * 0.65 };
    }
    function resize() {
      const r = el.getBoundingClientRect(),
        dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      m.resize(r.width, r.height);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    const visibility = () => {
      if (document.hidden) {
        pauseRef.current = true;
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    function frame(now: number) {
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      if (!pauseRef.current) {
        const rect = actor.current?.getBoundingClientRect(),
          box = el.getBoundingClientRect();
        if (rect) {
          const px = rect.left + rect.width * 0.46 - box.left,
            py = rect.top + rect.height * 0.53 - box.top;
          const [mx, my] = weaponOrigins.knight[level - 1],
            base = (-34 * Math.PI) / 180;
          const offset =
            (mx - 0.46) * rect.width * Math.sin(base) -
            (my - 0.53) * rect.height * Math.cos(base);
          const correction =
            (Math.asin(
              Math.max(
                -0.95,
                Math.min(
                  0.95,
                  offset / Math.max(1, Math.hypot(m.aim.x - px, m.aim.y - py))
                )
              )
            ) *
              180) /
            Math.PI;
          const angle = Math.max(
            -28,
            Math.min(
              58,
              (Math.atan2(m.aim.y - py, m.aim.x - px) * 180) / Math.PI +
                34 +
                correction
            )
          );
          actor.current!.style.setProperty("--range-aim", angle + "deg");
        }
        m.step(dt, origin);
        el.dataset.attackPhase = m.phase;
        el.dataset.targets = String(m.targetsHit);
        el.dataset.shots = String(m.shots);
        el.dataset.multiHit = String(m.bestMultiHit);
        for (const event of m.events.splice(0)) {
          if (event !== "group")
            playWorldSound(
              event === "fire"
                ? "rocketLaunch"
                : event === "impact"
                ? "explosion"
                : event === "flight"
                ? "rocketFlight"
                : event === "multiHit"
                ? "multiHit"
                : "rocketAim"
            );
        }
        if (now - lastHud > 90) {
          setHud({
            time: Math.ceil(SESSION_SECONDS - m.time),
            score: m.score,
            combo: m.combo,
            hits: m.targetsHit,
            phase: m.phase,
          });
          lastHud = now;
        }
        if (m.finished) {
          finishRef.current(true);
          return;
        }
      }
      drawRange(ctx!, m, origin());
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [screen, level]);
  function aim(clientX: number, clientY: number, fire = false) {
    if (screen !== "play" || paused) return;
    const b = stage.current!.getBoundingClientRect(),
      p = { x: clientX - b.left, y: clientY - b.top };
    if (fire) model.current?.trigger(p);
    else model.current?.setAim(p);
  }
  if (hero !== "knight")
    return (
      <main className="polygon-lobby range-other">
        <header>
          <button className="lesson-secondary" onClick={back}>
            ← Map
          </button>
          <SoundToggle />
        </header>
        <div className="range-lobby-hero">
          <HeroActor id={hero} parts={parts} />
        </div>
        <section className="range-card">
          <span className="eyebrow">HERO TRAINING GROUND</span>
          <h1>Today: rocket trials</h1>
          <p>
            This training ground is ready for Officer Cannon. Take the launcher and test the strength you earned in chess.
          </p>
          <button className="world-button" onClick={onOfficer}>
            Choose Officer Cannon →
          </button>
          <button className="lesson-back" onClick={back}>
            Return to your adventure
          </button>
        </section>
      </main>
    );
  return (
    <main className="polygon" data-weapon-level={level}>
      <header className="range-header">
        <button
          className="lesson-secondary"
          onClick={() => (screen === "play" ? setPaused(true) : back())}
        >
          ← {screen === "play" ? "Pause" : "Map"}
        </button>
        <div>
          <small>HERO TRAINING GROUND</small>
          <strong>
            {weaponName.knight[level - 1]} · {roman}
          </strong>
        </div>
        <SoundToggle />
      </header>
      {screen === "play" ? (
        <>
          <div className="range-hud" aria-live="off">
            <span>
              <strong className={hud.time <= 10 ? "range-urgent" : ""}>
                ⏱ {hud.time} sec
              </strong>
            </span>
            <span>
              <strong>🎯 {hud.hits} / 15</strong>
            </span>
            <span>
              <strong>⭐ {hud.score.toLocaleString("ru")}</strong>
            </span>
          </div>
          <div
            className="range-stage"
            ref={stage}
            data-attack-phase="idle"
            data-weapon-level={level}
          >
            <div className="range-lane" />
            <div className="range-shooting-hero" ref={actor}>
              <HeroActor id="knight" parts={parts} aimingAngle={0} />
            </div>
            <canvas
              ref={canvas}
              tabIndex={0}
              aria-label="Training ground. Aim with your mouse or tap a target to fire. Arrow keys aim; space fires."
              onPointerMove={(e) => aim(e.clientX, e.clientY)}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.focus();
                e.currentTarget.setPointerCapture(e.pointerId);
                aim(e.clientX, e.clientY, true);
              }}
              onKeyDown={(e) => {
                const m = model.current;
                if (!m || paused) return;
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  m.trigger(m.aim);
                } else if (e.key.startsWith("Arrow")) {
                  e.preventDefault();
                  m.setAim({
                    x:
                      m.aim.x +
                      (e.key === "ArrowLeft"
                        ? -20
                        : e.key === "ArrowRight"
                        ? 20
                        : 0),
                    y:
                      m.aim.y +
                      (e.key === "ArrowUp"
                        ? -20
                        : e.key === "ArrowDown"
                        ? 20
                        : 0),
                  });
                } else if (e.key === "Escape") setPaused(true);
              }}
            />
            <div className="range-callout" aria-hidden="true">
              {hud.combo >= 2
                ? `Streak ${hud.combo}!`
                : level >= 3
                ? "Catch three shields in one blast"
                : "Aim a little ahead"}
            </div>
          </div>
          <p className="range-instruction">
            Aim and click. On a phone, tap where you want to shoot.
          </p>
        </>
      ) : (
        <div className="polygon-lobby">
          <div className="range-lobby-hero">
            <HeroActor
              id="knight"
              parts={parts}
              celebrating={screen === "result"}
            />
          </div>
          <section className="range-card">
            {screen === "intro" ? (
              <>
                <span className="eyebrow">
                  {isUpgrade ? "NEW POWER-UP!" : "HERO TRAINING GROUND"}
                </span>
                <h1>
                  {weaponName.knight[level - 1]}{" "}
                  <span className="range-tier">{roman}</span>
                </h1>
                <div className="range-power">
                  <strong>
                    💥{" "}
                    {
                      [
                        "Precision shot",
                        "New sight",
                        "Boosted charge",
                        "Area blast",
                        "Solar blast",
                      ][level - 1]
                    }
                  </strong>
                </div>
                <p>
                  {level >= 3
                    ? "Catch a group of shields in one shot!"
                    : "Aim a little ahead of a moving shield."}
                </p>
                <button className="world-button" onClick={start}>
                  {isUpgrade ? "Try it" : "Start"} →
                </button>
                <small>60 seconds · 15 shields</small>
              </>
            ) : (
              <>
                <span className="eyebrow">
                  {run?.completed ? "CHALLENGE COMPLETE!" : "ROUND STOPPED"}
                </span>
                <h1>
                  {run?.completed && run.score > prior.current
                    ? "🏆 New record!"
                    : (run?.targetsHit || 0) >= 15
                    ? "A precise volley!"
                    : "Good practice!"}
                </h1>
                <div className="range-result-stats">
                  <strong>🎯 {run?.targetsHit} / 15</strong>
                  <strong>⭐ {run?.score.toLocaleString("ru")}</strong>
                </div>
                <div className="range-best-blast">
                  <span>💥 BEST BLAST</span>
                  <strong>
                    {run?.bestMultiHit || 0}{" "}
                    {run?.bestMultiHit === 1
                      ? "target"
                      : (run?.bestMultiHit || 0) >= 2 &&
                        (run?.bestMultiHit || 0) <= 4
                      ? "targets"
                      : "targets"}
                  </strong>
                </div>
                {run?.completed && run.upgradeTest && (
                  <p className="range-tested">
                    ☀{" "}
                    {level === 5
                      ? "Solar launcher tested!"
                      : "New weapon tested!"}
                  </p>
                )}
                {prior.current > 0 && (
                  <small>
                    Previous record for this launcher:{" "}
                    {prior.current.toLocaleString("ru")}
                  </small>
                )}
                {run?.completed && run.targetsHit >= 8 && (
                  <p className="range-medal">
                    {run.targetsHit >= 25
                      ? "🥇 Golden volley"
                      : run.targetsHit >= 15
                      ? "🥈 Silver shooter"
                      : "🥉 First trophy"}
                  </p>
                )}
                <div className="range-result-actions">
                  {rounds < 2 && (
                    <button className="world-button" onClick={start}>
                      Again →
                    </button>
                  )}
                  <button
                    className={
                      rounds >= 2 ? "world-button" : "lesson-secondary"
                    }
                    onClick={back}
                  >
                    Return to the world →
                  </button>
                  {rounds >= 2 && (
                    <button className="lesson-secondary" onClick={start}>
                      Again
                    </button>
                  )}
                </div>
                <button className="lesson-back" onClick={onChess}>
                  Back to chess for your next power-up
                </button>
                {!run?.completed && (
                  <small>An unfinished round does not change records or medals.</small>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {paused && screen === "play" && (
        <div
          className="range-pause"
          role="dialog"
          aria-modal="true"
          aria-label="Training ground paused"
        >
          <section className="range-card">
            <h1>Take a breath</h1>
            <p>Time has stopped. Your rocket can wait.</p>
            <button
              className="world-button"
              autoFocus
              onClick={() => setPaused(false)}
            >
              Continue
            </button>
            <button className="lesson-secondary" onClick={back}>
              Finish and return to the map
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
