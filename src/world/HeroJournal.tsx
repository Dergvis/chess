import {publishMobileScreen} from './mobile/MobileGameShell';
import {topicMastery} from "./personalLearning";
import { useEffect, useRef, useState } from "react";
import HeroActor from "./HeroActor";
import RestartAdventure from './RestartAdventure';
import Badge, { Stars, type BadgeKind } from "./Badge";
import { weaponName } from "./weapons";
import {
  character,
  nextUpgrade,
  partNames,
  partThresholds,
  abilities,
  masteryTitle,
  weeklyDays,
} from "./growth";
import { forSkill, heroArt, skills, territories } from "./catalog";
import type { WorldSave } from "./types";
export type JournalTab = "hero" | "skills" | "trophies";
export default function HeroJournal({
  save,
  initial,
  onClose,
  onHeroes,
}: {
  save: WorldSave;
  initial: JournalTab;
  onClose: () => void;
  onHeroes: () => void;
}) {
  const [detail, setDetail] = useState<string | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [tab, setTab] = useState(initial),
    ref = useRef<HTMLDivElement>(null);
  useEffect(()=>{publishMobileScreen(tab==='hero'?'hero':'skills',tab==='hero'?"My hero":"Skills");},[tab]);
  const p = character(save),
    h = p.characterId,
    next = nextUpgrade(save),
    a = save.achievements!;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const list = Array.from(
          ref.current!.querySelectorAll<HTMLElement>(
            "button:not(:disabled),[href]"
          )
        );
        const first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="journal-scrim">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Adventure book"
        className="hero-journal"
      >
        <header>
          <span className="journal-brand">ADVENTURE BOOK</span>
          <button
            className="lesson-secondary"
            onClick={onClose}
            aria-label="Close the book"
          >
            ×
          </button>
        </header>
        <nav aria-label="Your progress">
          {(
            [
              ["hero", "My hero"],
              ["skills", "My skills"],
              ["trophies", "My achievements"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === "hero" ? (
          <div className="album-hero">
            <div className="album-character">
              <HeroActor id={h} parts={preview ?? p.equippedParts.length} />
              <span className="hero-plinth">
                LEVEL {(preview ?? p.equippedParts.length) + 1}
              </span>
            </div>
            <div className="album-hero-info">
              <h1>{heroArt[h].name}</h1>
              <Stars value={(preview ?? p.equippedParts.length) + 1} />
              <h2>{weaponName[h][preview ?? p.equippedParts.length]}</h2>
              <div className="weapon-collection" aria-label="Hero appearances">
                {[0, 1, 2, 3, 4].map((i) => (
                  <button
                    key={i}
                    disabled={i > p.equippedParts.length}
                    aria-label={"Weapon level " + (i + 1)}
                    aria-pressed={i === (preview ?? p.equippedParts.length)}
                    onClick={() => setPreview(i)}
                  >
                    <HeroActor id={h} parts={i} />
                    <span>{i <= p.equippedParts.length ? i + 1 : "?"}</span>
                  </button>
                ))}
              </div>
              <div className="next-upgrade">
                <strong>
                  {next.remaining
                    ? "Another " + next.remaining + " steps to a power-up"
                    : "Every power-up collected!"}
                </strong>
                <progress
                  value={p.progress}
                  max={p.progress + next.remaining || 1}
                />
              </div>
              <button className="lesson-secondary" onClick={onHeroes}>
                Other heroes
              </button>
            </div>
          </div>
        ) : tab === "skills" ? (
          <section className="journal-content">
            <h1>My skills</h1>
            <div className="skill-album">
              {skills.map((k) => (
                <button
                  key={k}
                  className="skill-medal"
                  aria-expanded={detail === k}
                  onClick={() => setDetail(detail === k ? null : k)}
                >
                  <div
                    className="medal-ring"
                    style={
                      {
                        "--progress": save.mastery[k].points + "%",
                      } as React.CSSProperties
                    }
                  >
                    <Badge kind={k} />
                  </div>
                  <h2>{territories.find((t) => t.id === k)!.short}</h2>
                  <Stars value={Math.floor(save.mastery[k].points / 20)} />
                  <small>{topicMastery(save,k).label}</small>
                  
                  {detail === k && (
                    <span className="medal-detail">
                      {topicMastery(save,k).label}
                      <br />
                      {save.learning ? `${save.learning.paths[k]?.completed.length||0} / 4 stages` : `${save.territories![k].progress} / ${forSkill(k).length} challenges`}
                      <br />
                      {save.mastery[k].realGame > 0
                        ? "Used in a game"
                        : "Game practice awaits"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="journal-content">
            <h1>My achievements</h1>
            <div className="achievement-album">
              {(
                [
                  ["games", a.gamesPlayed, "GAMES"],
                  ["wins", a.wins, "WINS"],
                  ["puzzles", a.puzzlesSolved, "PUZZLES"],
                  ["fork", a.forksFound, "FORKS"],
                  [
                    "castle",
                    skills.filter(
                      (k) =>
                        save.learning ? save.learning.paths[k]?.completed.length===4 : save.territories![k].progress === forSkill(k).length
                    ).length,
                    "FORTRESSES",
                  ],
                  ["star", a.skillsMastered, "SKILLS"],
                ] as [BadgeKind, number, string][]
              ).map(([icon, n, label]) => (
                <article key={label}>
                  <Badge kind={icon} />
                  <strong>{n}</strong>
                  <small>{label}</small>
                </article>
              ))}
            </div>
            <div className="weekly-album">
              <Badge kind="star" />
              <div>
                <strong>Chess week</strong>
                <Stars max={7} value={weeklyDays(save)} />
              </div>
            </div>
            <h2>My fortresses</h2>
            <div className="castle-collection">
              {skills.map((k) => {
                const n = save.learning ? save.learning.paths[k]?.completed.length||0 : save.territories![k].progress,
                  total = save.learning ? 4 : forSkill(k).length,
                  won = n === total;
                const positions:Record<string,string> = {
                  fork: "48% 33%",
                  mate: "13% 48%",
                  pin: "20% 24%",
                  defense: "65% 69%",
                  doubleAttack: "81% 24%",
                };
                return (
                  <article key={k} className={won ? "conquered" : "unexplored"}>
                    <div
                      className="castle-miniature"
                      style={{
                        backgroundImage:
                          "url(/world-art/" +
                          (won ? "map-won" : "map") +
                          ".png)",
                        backgroundPosition: positions[k]||"50% 40%",
                      }}
                    />
                    <Badge kind={k} />
                    <strong>{territories.find((t) => t.id === k)!.name}</strong>
                    <span>{won ? "Freed ✓" : n + " / " + total}</span>
                    <progress max={total} value={n} />
                  </article>
                );
              })}
            </div>
          </section>
        )}
        <RestartAdventure save={save} />
      </div>
    </div>
  );
}
