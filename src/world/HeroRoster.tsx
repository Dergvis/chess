import { useState } from "react";
import HeroActor from "./HeroActor";
import { heroArt } from "./catalog";
import { character, plural } from "./growth";
import { weaponName } from "./weapons";
import type { HeroId, WorldSave } from "./types";

export default function HeroRoster({
  save,
  onSelect,
  onBack,
}: {
  save: WorldSave;
  onSelect: (hero: HeroId) => void;
  onBack: () => void;
}) {
  const ids: HeroId[] = ["inventor", "mage", "knight"];
  const [preview, setPreview] = useState<Partial<Record<HeroId, number>>>({});
  return (
    <section className="hero-roster" aria-label="Change hero">
      <header>
        <button className="lesson-secondary" onClick={onBack}>
          ← Return to the world
        </button>
        <h1>Choose an adventure hero</h1>
        <p>Each grows in a different way. All earned improvements are saved.</p>
      </header>
      <div className="roster-cards">
        {ids.map((id) => {
          const progress = character(save, id),
            earned = progress.equippedParts.length;
          const shown = preview[id] ?? earned;
          const current = save.player.selectedCharacter === id;
          return (
            <article
              className={"roster-card " + (current ? "current" : "")}
              key={id}
            >
              <h2>{heroArt[id].name}</h2>
              <span>
                Your level: {earned + 1} · {progress.progress}{" "}
                {plural(progress.progress, "step", "steps", "steps")}
              </span>
              <div className="roster-actor">
                <HeroActor id={id} parts={shown} />
              </div>
              <strong>{weaponName[id][shown]}</strong>
              <p className="roster-preview-status">
                {shown > earned
                  ? "Future improvement · not earned yet"
                  : shown === earned
                  ? "Your hero now"
                  : "A completed stage"}
              </p>
              <div
                className="roster-stages"
                aria-label={"Hero stages " + heroArt[id].name}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <button
                    key={i}
                    aria-pressed={shown === i}
                    aria-label={
                      heroArt[id].name + ": see level " + (i + 1)
                    }
                    onClick={() => setPreview((p) => ({ ...p, [id]: i }))}
                  >
                    <HeroActor id={id} parts={i} />
                    <span>
                      {i + 1}
                      {i > earned ? " · ◇" : " · ✓"}
                    </span>
                  </button>
                ))}
              </div>
              <button className="world-button" onClick={() => onSelect(id)}>
                {current ? "Continue with this hero" : "Choose a hero"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
