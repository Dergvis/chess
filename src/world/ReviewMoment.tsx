import { useEffect, useState } from "react";
import { ChessCore } from "../entities/chess/ChessCore";
import GameScreen from "../features/game/GameScreen";
import { getCharacter } from "../entities/character/characters";
import { getPieceSkin } from "../entities/piece-skins/pieceSkins";
import { getDifficultyPreset } from "../shared/config/difficulty";
import { isGameReview } from "./gameRecord";
import Puzzle from "./Puzzle";
import ChallengeSession from "./challenges/Session";
import { personalExercise } from "./challenges/catalog";
import type { Attempt } from "./challenges/types";
import type { GameRecord, WorldSave } from "./types";
export default function ReviewMoment({
  game,
  save,
  onComplete,
  onBack,
  isGuest = false,
  onAttempt,
}: {
  game: GameRecord;
  save: WorldSave;
  onComplete: () => void;
  onBack: () => void;
  isGuest?: boolean;
  onAttempt?: (attempt: Attempt) => void;
}) {
  const review = game.analysis!.review!,
    valid = isGameReview(game, review),
    actual = game.moves[review.ply],
    previous = game.moves[review.ply - 1];
  const [tryMove, setTryMove] = useState(false),
    [round, setRound] = useState(0),
    [phase, setPhase] = useState(0),
    [busy, setBusy] = useState(false);
  const [core, setCore] = useState(
      () => new ChessCore(previous?.before || review.fen)
    ),
    [state, setState] = useState(core.getState());
  useEffect(() => {
    if (!valid || tryMove || busy || phase >= 3) return;
    const timer = setTimeout(
      () => {
        if (phase === 0 && previous) {
          core.makeMove({ ...previous, promotion: previous.promotion as any });
          setState(core.getState());
        }
        if (phase === 1) {
          core.makeMove({ ...actual, promotion: actual.promotion as any });
          setState(core.getState());
        }
        setPhase((p) => p + 1);
      },
      phase === 0 ? 900 : 1500
    );
    return () => clearTimeout(timer);
  }, [phase, busy, tryMove, round]);
  if (!valid)
    return (
      <main className="activity-shell">
        <h1>This moment is unavailable</h1>
        <button className="world-button" onClick={onBack}>
          Return to the result
        </button>
      </main>
    );
  if (tryMove)
    if (onAttempt && personalExercise(game))
      return (
        <ChallengeSession
          exercise={personalExercise(game)!}
          mode="personal"
          isGuest={isGuest}
          onResult={(a) => {
            onAttempt(a);
            if (a.correct) onComplete();
          }}
          onContinue={onBack}
          onExit={onBack}
        />
      );
  if (tryMove)
    return (
      <Puzzle
        isGuest={isGuest}
        key={game.id + "-review"}
        puzzle={review}
        save={{
          ...save,
          player: {
            ...save.player,
            selectedCharacter:
              game.characterId || save.player.selectedCharacter,
          },
        }}
        onComplete={onComplete}
        onBack={onBack}
        backLabel="Return to the world"
      />
    );
  const number = Number(review.fen.split(" ")[5]);
  const restart = () => {
    const c = new ChessCore(previous?.before || review.fen);
    setCore(c);
    setState(c.getState());
    setBusy(false);
    setPhase(0);
    setRound((n) => n + 1);
  };
  return (
    <section
      className="original-puzzle real-game-replay"
      data-game-id={game.id}
      data-review-ply={review.ply}
    >
      <GameScreen
        key={round}
        gameState={state}
        isGuest={isGuest}
        playerColor={game.playerColor}
        opponent={getCharacter(game.opponent)}
        pieceSkin={getPieceSkin("default")}
        difficulty={getDifficultyPreset("level_1")}
        selectedSquare={null}
        legalMoves={[]}
        onSelectSquare={() => {}}
        onMakeMove={() => {}}
        onResign={onBack}
        isEngineTurn
        onAnimationBusyChange={setBusy}
        training={{
          targets: [],
          panel: (
            <div className="lesson-panel">
              <span className="lesson-number">YOUR GAME · MOVE {number}</span>
              <h1>{phase < 2 ? "See what happened" : "You played this move"}</h1>
              <p>
                {phase < 1 && previous
                  ? "First, your opponent’s move."
                  : phase === 1
                  ? "Now your reply."
                  : `${actual.from} → ${actual.to}`}
              </p>
              {phase >= 3 && !busy && (
                <>
                  <p>
                    {review.loss === 0
                      ? "You found a strong move. Play it again!"
                      : "There was another interesting option here."}
                  </p>
                  <button
                    className="world-button"
                    onClick={() => setTryMove(true)}
                  >
                    {review.loss === 0
                      ? "Repeat your move"
                      : "Try another way"}{" "}
                    →
                  </button>
                  <button className="lesson-secondary" onClick={restart}>
                    Watch again
                  </button>
                </>
              )}
              <button className="lesson-back" onClick={onBack}>
                Return to the world
              </button>
            </div>
          ),
          move: phase >= 2 ? actual : phase >= 1 ? previous : undefined,
        }}
      />
    </section>
  );
}
