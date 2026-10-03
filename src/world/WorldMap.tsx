import {worldRegions} from './regions';
import {topicMastery} from './personalLearning';
import {accessConfig} from './access';
import WorldTour from "./WorldTour";
import { character, nextUpgrade, partThresholds } from "./growth";
import SoundToggle from "./SoundToggle";
import type { JournalTab } from "./HeroJournal";
import { useEffect, useRef, useState } from "react";
import HeroActor from "./HeroActor";
import type { HeroId, HeroState, WorldSave } from "./types";
import { heroArt, forSkill, territories } from "./catalog";
import { emit } from "./events";
import { pathSamples, pointOnPath, travelProgress } from "./movement";
import {
  conquered,
  journeyOrder,
  locationUnlocked,
  mistyUnlocked,
  nextLocation,
} from "./journey";

type Point = { x: number; y: number };
// Each endpoint is the foot of an existing painted building. Routes share the
// painted roads and bridges; labels sit beneath the buildings, never on the road.
const camp: Point = { x: 350, y: 530 };
const locations: Record<string, Point> = {
  camp,
  mate: { x: 119, y: 219 },
  pin: { x: 944, y: 235 },
  fork: { x: 487, y: 222 },
  doubleAttack: { x: 805, y: 211 },
  defense: { x: 697, y: 476 },
  polygon: { x: 300, y: 515 },
  arena: { x: 886, y: 325 },
};
const junction: Point = { x: 514, y: 326 };
const roads: Record<string, Point[]> = {
  camp: [
    junction,
    { x: 422, y: 370 },
    { x: 362, y: 415 },
    { x: 373, y: 478 },
    camp,
  ],
  mate: [
    junction,
    { x: 422, y: 370 },
    { x: 362, y: 415 },
    { x: 318, y: 366 },
    { x: 260, y: 323 },
    { x: 211, y: 302 },
    { x: 154, y: 296 },
    { x: 104, y: 285 },
    { x: 77, y: 264 },
    { x: 103, y: 238 },
    locations.mate,
  ],
  pin: [
    junction,
    { x: 620, y: 357 },
    { x: 710, y: 349 },
    { x: 796, y: 324 },
    { x: 826, y: 289 },
    { x: 877, y: 263 },
    locations.pin,
  ],
  fork: [junction, { x: 550, y: 298 }, { x: 527, y: 264 }, locations.fork],
  doubleAttack: [
    junction,
    { x: 620, y: 357 },
    { x: 710, y: 349 },
    { x: 796, y: 324 },
    { x: 826, y: 289 },
    { x: 834, y: 248 },
    locations.doubleAttack,
  ],
  defense: [
    junction,
    { x: 620, y: 357 },
    { x: 710, y: 349 },
    { x: 720, y: 398 },
    { x: 702, y: 439 },
    locations.defense,
  ],
  arena: [
    junction,
    { x: 620, y: 357 },
    { x: 710, y: 349 },
    { x: 796, y: 324 },
    locations.arena,
  ],
  polygon: [
    junction,
    { x: 422, y: 370 },
    { x: 362, y: 415 },
    { x: 373, y: 478 },
    camp,
    locations.polygon,
  ],
};
const locationFor = (id: string): Point => locations[id] || camp;
function routeBetween(from: string, to: string): Point[] {
  const a = roads[from] || roads.camp,
    b = roads[to] || roads.camp;
  let shared = 0;
  while (
    shared + 1 < Math.min(a.length, b.length) &&
    a[shared + 1].x === b[shared + 1].x &&
    a[shared + 1].y === b[shared + 1].y
  )
    shared++;
  return pathSamples([...a.slice(shared).reverse(), ...b.slice(shared + 1)]);
}
const signs: Record<string, [number, number, string]> = {
  mate: [12, 38, "♚"],
  pin: [92, 39, "♝"],
  fork: [49, 37, "♞"],
  doubleAttack: [80.5, 36, "♛"],
  defense: [69.7, 79, "♜"],
  arena: [88, 51, "⚔"],
};
// Bounds surround the actual castle artwork, independently of its caption.
const castleBounds: Record<string, [number, number, number, number]> = {
  mate: [9, 25, 18, 25],
  pin: [94, 29, 11, 19],
  fork: [49, 22, 23, 34],
  doubleAttack: [80, 24, 17, 22],
  defense: [69, 64, 19, 29],
};
export function HeroSprite({
  id,
  state = "idle",
  parts = 0,
}: {
  id: HeroId;
  state?: HeroState;
  parts?: number;
}) {
  return (
    <foreignObject width="190" height="245">
      <HeroActor
        id={id}
        moving={state === "moving"}
        celebrating={state === "celebration"}
        parts={parts}
      />
    </foreignObject>
  );
}
export default function WorldMap({
  save,
  onArrive,
  onHero,
  onReview,
  onChangeHero,
  onAccount,
  onMixed,onRegion,
  autoTravelTo,
  onTourDone,
  onParent,onTraining,
}: {
  save: WorldSave;
  onArrive: (id: string) => void;
  onHero: (tab: JournalTab) => void;
  onReview: () => void;
  onChangeHero: () => void;
  onAccount?: () => void;
  onMixed?: () => void;
  onRegion:(id:string)=>void;
  autoTravelTo?: string | null;
  onTourDone: () => void;
  onParent:()=>void;onTraining:(topic:string)=>void;
}) {
  const [tour, setTour] = useState(
    !save.journey?.onboardingSeen && !save.journey?.legacyOpen
  );
  const hero = save.player.selectedCharacter || "inventor";
  const start = locationFor(save.worldProgress.location);
  const [point, setPoint] = useState(start);
  const [phase, setPhase] = useState<
    "idle" | "start_move" | "travelling" | "arrival"
  >("idle");
  const [destination, setDestination] = useState<string | null>(null);
  const [facing, setFacing] = useState(1);
  const view = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLDivElement>(null);
  const animation = useRef(0),
    autoUsed = useRef(false),
    lock = useRef(false);
  useEffect(()=>{const show=()=>setTour(true);window.addEventListener('chezzies-show-tour',show);return()=>window.removeEventListener('chezzies-show-tour',show);},[]);
  const done = forSkill("fork").filter((c) =>
    save.worldProgress.completedChallenges.includes(c.id)
  ).length;
  useEffect(() => {
    emit("map_opened", { location: save.worldProgress.location });
    return () => cancelAnimationFrame(animation.current);
  }, []);
  useEffect(() => {
    if (!canvas.current || !view.current) return;
    const viewport = view.current,
      landscape = canvas.current;
    const center = () =>
      viewport.scrollTo({
        left:
          (point.x / 1000) * landscape.clientWidth -
          viewport.clientWidth * 0.46 - (window.innerWidth <= 760 ? 140 : 0),
        top:
          (point.y / (2000 / 3)) * landscape.clientHeight -
          viewport.clientHeight * 0.64,
        behavior: "auto",
      });
    center();
    window.addEventListener("resize", center);
    return () => window.removeEventListener("resize", center);
  }, [point]);
  function travel(id: string) {
    if (lock.current || !locationUnlocked(save, id)) return;
    lock.current = true;
    setDestination(id);
    setPhase("start_move");
    emit("territory_selected", { territory: id });
    emit("character_travel_started", {
      hero,
      from: save.worldProgress.location,
      to: id,
    });
    const here = save.worldProgress.location;
    const points =
      here === id ? [point, locationFor(id)] : routeBetween(here, id);
    const ahead = pointOnPath(points, 0.03);
    if (Math.abs(ahead.x - point.x) > 0.8)
      setFacing(ahead.x > point.x ? 1 : -1);
    const length = points.reduce(
      (n, p, i) =>
        i ? n + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : 0,
      0
    );
    const duration =
      here === id ? 650 : Math.max(3500, Math.min(7200, length * 14));
    let startTime: number | undefined;
    const frame = (time: number) => {
      startTime ??= time;
      const elapsed = time - startTime;
      if (elapsed < 450) {
        animation.current = requestAnimationFrame(frame);
        return;
      }
      const t = Math.min(1, (elapsed - 450) / duration);
      if (t < 1) {
        setPhase("travelling");
        const eased = travelProgress(t),
          p = pointOnPath(points, eased),
          ahead = pointOnPath(points, Math.min(1, eased + 0.015));
        setPoint(p);
        if (Math.abs(ahead.x - p.x) > 0.8) setFacing(ahead.x > p.x ? 1 : -1);
        animation.current = requestAnimationFrame(frame);
      } else {
        setPoint(locationFor(id));
        setPhase("arrival");
        if (elapsed < duration + 1250)
          animation.current = requestAnimationFrame(frame);
        else {
          emit("character_arrived", { hero, territory: id });
          onArrive(id);
        }
      }
    };
    animation.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    if (autoTravelTo && !autoUsed.current) {
      autoUsed.current = true;
      travel(autoTravelTo);
    }
    return () => {
      autoUsed.current = false;
      lock.current = false;
      cancelAnimationFrame(animation.current);
    };
  }, [autoTravelTo]);
  const continuation=journeyOrder(save).every(k=>conquered(save,k))?worldRegions(save).filter(r=>r.open).reverse()[0]:undefined;
  const recommended = nextLocation(save),
    fogOpen = mistyUnlocked(save);
  const progress = character(save),
    next = nextUpgrade(save);
  return (
    <main className="world-scene map-v2" data-movement-state={phase}>
      <header className="scene-header">
        <div>
          <strong>CHEZZIES</strong>
          <span>Your adventure</span>
        </div>
        <nav>
          <button onClick={() => setTour(true)} disabled={phase !== "idle"}>
            How to play
          </button>
          <SoundToggle />
          {onAccount && (
            <button onClick={onAccount} disabled={phase !== "idle"}>
              Account
            </button>
          )}
          <button onClick={() => onHero("skills")} disabled={phase !== "idle"}>
            My skills
          </button>
          <button
            onClick={() => onHero("trophies")}
            disabled={phase !== "idle"}
          >
            Achievements
          </button>
        </nav>
      </header>
      <button className="mobile-hero-chip" onClick={()=>onHero('hero')} aria-label="Open my hero"><img src={heroArt[hero].image || '/assets/pieces/w-n.png'} alt=""/><span>Lv. {progress.level}<progress value={progress.progress} max={partThresholds[progress.equippedParts.length] || progress.progress || 1}/></span></button>
      <aside className="hero-hud">
        <div className="hud-portrait">
          <HeroActor id={hero} parts={progress.equippedParts.length} />
        </div>
        <div>
          <strong>{heroArt[hero].name}</strong>
          <span>Level {progress.level}</span>
          <progress
            value={
              progress.equippedParts.length >= 4
                ? 1
                : (progress.progress -
                    (partThresholds[progress.equippedParts.length - 1] || 0)) /
                  (partThresholds[progress.equippedParts.length] -
                    (partThresholds[progress.equippedParts.length - 1] || 0))
            }
            max={1}
          />
          <small>
            {next.remaining
              ? `Another ${next.remaining} ${
                  next.remaining === 1
                    ? "task"
                    : next.remaining < 5
                    ? "tasks"
                    : "tasks"
                } — and your hero earns a new improvement!`
              : "Every improvement collected!"}
          </small>
          <button onClick={() => onHero("hero")} disabled={phase !== "idle"}>
            My hero →
          </button>
          <button
            className="hero-change-link"
            onClick={onChangeHero}
            disabled={phase !== "idle"}
          >
            Change hero
          </button>
        </div>
      </aside>
      <span className="mobile-map-hint">← Move the map sideways →</span>
      <div className="world-viewport" ref={view}>
        <div ref={canvas} className="world-landscape">
          <img
            className="landscape-art"
            src={
              (
                save.learning
                  ? save.learning.paths.fork?.completed.length === 4
                  : done === 16
              )
                ? "/world-art/map-won.png"
                : (
                    save.learning
                      ? (save.learning.paths.fork?.completed.length || 0) > 0
                      : done >= 4
                  )
                ? "/world-art/map-damaged.png"
                : "/world-art/map.png"
            }
            alt="A mountain valley with castles, a river and paths"
            draggable={false}
          />
          <div className="world-state-layer" aria-hidden="true">
            {journeyOrder(save).map((id) => {
              const state = conquered(save, id)
                ? "completed"
                : recommended === id
                ? "recommended"
                : locationUnlocked(save, id)
                ? "available"
                : "locked";
              const [x, y, w, h] = castleBounds[id];
              return (
                <div
                  key={id}
                  className={"castle-state castle-" + state}
                  data-castle={id}
                  data-visual-state={state}
                  style={{
                    left: x + "%",
                    top: y + "%",
                    width: w + "%",
                    height: h + "%",
                  }}
                >
                  <span className="castle-atmosphere" />
                  {state === "recommended" && (
                    <span className="castle-beacon" />
                  )}
                  {state === "completed" && (
                    <span className="liberated-banner">
                      <b>⚑</b>
                      <span>✓</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <button
            className="world-marker marker-polygon available"
            data-territory="polygon"
            style={{ left: "26%", top: "79%" }}
            disabled={phase !== "idle"}
            onClick={() => travel("polygon")}
          >
            <span className="marker-shield">◎</span>
            <span className="marker-scroll">
              <strong>Hero training ground</strong>
              <small>Practise</small>
            </span>
          </button>
          {territories.map((t) => {
            const [x, y, icon] = signs[t.id] || [t.x / 10, t.y / 6.667, "◇"],
              total = save.learning ? 4 : forSkill(t.id).length,
              n = save.learning
                ? save.learning.paths[t.id]?.completed.length || 0
                : save.territories?.[t.id as keyof typeof save.territories]
                    ?.progress || 0;
            const unlocked = locationUnlocked(save, t.id);
            const state = !unlocked
              ? "locked"
              : t.id === "arena"
              ? "available"
              : n === total
              ? "completed"
              : recommended === t.id
              ? "recommended"
              : "available";
            return (
              <button
                key={t.id}
                className={
                  "world-marker marker-" +
                  t.id +
                  " " +
                  state +
                  (recommended === t.id ? " recommended-location" : "")
                }
                data-territory={t.id}
                data-state={state}
                data-story-active={
                  recommended === t.id && t.id !== "arena" ? "true" : undefined
                }
                style={{ left: x + "%", top: y + "%" }}
                disabled={phase !== "idle" || !unlocked}
                onClick={() => travel(t.id)}
              >
                <span className="marker-shield">
                  {!unlocked ? "🔒" : state === "completed" ? "⚑" : icon}
                </span>
                <span className="marker-scroll">
                  <strong>{t.name}</strong>
                  {state==="completed"&&topicMastery(save,t.id).weak&&<small>👀 Worth practising</small>}
                  <small>
                    {!unlocked
                      ? "🔒 This path is not open yet"
                      : t.id === "arena"
                      ? "Play against the computer"
                      : state === "completed"
                      ? "✓ Freed"
                      : recommended === t.id
                      ? n
                        ? "Continue here"
                        : "A suggested starting point"
                      : "Ready to explore"}
                  </small>
                </span>
              </button>
            );
          })}
          {worldRegions(save).map(r=><button key={r.id} className={'future-location '+(r.open?'region-open':'region-locked')} style={{left:r.x+'%',top:r.y+'%'}} disabled={!r.open} onClick={()=>onRegion(r.id)}><strong>{r.open?'⚑ ':''}{r.name}</strong><small>{r.open?r.description:"The path is hidden in mist"}</small></button>)}
          <div
            className="map-actor-position"
            style={{
              left: point.x / 10 + "%",
              top: point.y / (20 / 3) + "%",
              width: `clamp(65px, ${5 + point.y / 100}vw, ${
                65 + point.y / 8
              }px)`,
              zIndex: Math.round(point.y),
            }}
            data-location={save.worldProgress.location}
          >
            <HeroActor
              id={hero}
              moving={phase === "travelling"}
              facing={facing}
              parts={progress.equippedParts.length}
            />
          </div>
          <span className="camp-label">⌂ Your camp</span>
          {onMixed && (
            <button
              className="misty-map-place"
              disabled={!fogOpen || phase !== "idle"}
              onClick={onMixed}
            >
              <strong>{fogOpen ? "✧" : "🔒"} Misty Lands</strong>
              <small>Challenges without topic clues</small>
              <small>
                {fogOpen
                  ? "The topic is hidden. Choose the tactic yourself."
                  : `🔒 Opens after you learn ${accessConfig.mistyLandsRequiredTopics} tactics`}
              </small>
            </button>
          )}
        </div>
      </div>
      <footer className="map-goal" role="status">
        <div>
          <strong>
            {phase === "idle"
              ? "Next destination: " +
                (continuation?.name || territories.find((t) => t.id === recommended)?.name || "Arena")
              : phase === "arrival"
              ? "At the gates!"
              : heroArt[hero].name +
                (phase === "start_move" ? " prepares for the journey…" : " is on the way…")}
          </strong>
        </div>
        {phase === "idle" && (
          <div className="map-action-stack">
            <button
              className="world-button"
              onClick={() => continuation?onRegion(continuation.id):travel(recommended)}
            >
              Let’s go →
            </button>
          </div>
        )}
      </footer>
      {tour && (
        <WorldTour
          onClose={() => {
            onTourDone();
            setTour(false);
          }}
          onGo={() => {
            onTourDone();
            setTour(false);
            travel(recommended);
          }}
        />
      )}
    </main>
  );
}
