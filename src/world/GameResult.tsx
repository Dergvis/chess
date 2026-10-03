import { useEffect } from "react";
import HeroActor from "./HeroActor";
import Badge from "./Badge";
import { character, plural } from "./growth";
import { forSkill, skills, territories } from "./catalog";
import { isGameReview } from "./gameRecord";
import { playWorldSound } from "./worldSound";
import type { GameRecord, Skill, WorldSave } from "./types";
export default function GameResult({
  game,
  save,
  analyzing,
  error,
  onRetry,
  onReview,
  onUpgrade,
  onBack,
  onTrain,
}: {
  game: GameRecord;
  save: WorldSave;
  analyzing: boolean;
  error: string;
  onRetry: () => void;
  onReview: () => void;
  onUpgrade: () => void;
  onBack: () => void;
  onTrain: () => void;
}) {
  const hero = game.characterId || save.player.selectedCharacter || "inventor",
    p = character(save, hero),
    r = game.rewards;
  const rewards = Object.entries(r?.skills || {}).filter(([, n]) => n! > 0) as [
    Skill,
    number
  ][];
  const hasReview =
      game.analysis?.review && isGameReview(game, game.analysis.review),
    upgrade = r && !r.upgradeClaimed && r.toParts > r.fromParts;
  const target = skills.find(
      (k) => save.learning ? (save.learning.paths[k]?.completed.length||0)<4 : save.territories![k].progress < forSkill(k).length
    ),
    remaining = target
      ? forSkill(target).filter(
          (c) =>
            c.chapter === save.territories![target].chapter &&
            !save.worldProgress.completedChallenges.includes(c.id)
        ).length
      : 0;
  useEffect(() => {
    playWorldSound("success");
  }, [game.id]);
  return (
    <main className="game-result" data-result-id={game.id}>
      <h1>
        {game.result === "win"
          ? "VICTORY!"
          : game.result === "draw"
          ? "EVENLY MATCHED!"
          : "A GOOD BATTLE!"}
      </h1>
      <div className="result-character">
        <HeroActor
          id={hero}
          parts={upgrade ? r.fromParts : p.equippedParts.length}
          celebrating
        />
      </div>
      <section className="result-rewards" aria-label="Rewards earned">
        <article>
          <Badge kind="hero" />
          <small>HERO</small>
          <strong>
            +{r?.heroSteps || 0}{" "}
            {plural(r?.heroSteps || 0, "step", "steps", "steps")}
          </strong>
        </article>
        <article>
          <Badge kind={rewards[0]?.[0] || "puzzles"} />
          <small>SKILL</small>
          {rewards.length ? (
            rewards.map(([skill, n]) => (
              <strong key={skill}>
                {territories.find((t) => t.id === skill)!.short} +{n}%
              </strong>
            ))
          ) : (
            <strong>{analyzing ? "Looking for discoveries…" : "New experience"}</strong>
          )}
        </article>
        <article>
          <Badge kind="castle" />
          <small>WORLD</small>
          <strong>
            {save.learning && target ? "Continue the skill journey" : remaining
              ? `Another ${remaining} ${plural(
                  remaining,
                  "challenge",
                  "challenges",
                  "challenges"
                )}`
              : "Every fortress is yours!"}
          </strong>
          {target && (
            <span>{territories.find((t) => t.id === target)!.name}</span>
          )}
        </article>
      </section>
      <div className="result-actions" aria-live="polite">
        {analyzing ? (
          <p>Reviewing your game…</p>
        ) : error ? (
          <>
            <p>{error}</p>
            <button className="world-button" onClick={onRetry}>
              Retry the review
            </button>
          </>
        ) : upgrade ? (
          <button className="world-button" onClick={onUpgrade}>
            Collect your power-up →
          </button>
        ) : hasReview ? (
          <button className="world-button" onClick={onReview}>
            {game.reviewCompleted
              ? "Replay a moment from your game"
              : "See a moment from your game"}{" "}
            →
          </button>
        ) : (
          <>
            <p>
              {game.moves.length < 8
                ? "A short game is the start of a journey."
                : "This game did not contain a simple learning moment."}
            </p>
            <button className="world-button" onClick={onTrain}>
              Practice challenge →
            </button>
          </>
        )}
        <button
          className={hasReview || upgrade ? "lesson-secondary" : "lesson-back"}
          onClick={onBack}
        >
          Return to the world
        </button>
      </div>
    </main>
  );
}
