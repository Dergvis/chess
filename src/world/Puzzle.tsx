import Badge from "./Badge";
import { playWorldSound } from "./worldSound";
import { forSkill } from "./catalog";
import { character, nextUpgrade, chapters, plural } from "./growth";
import type { WorldSave } from "./types";
import { useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessCore } from "../entities/chess/ChessCore";
import GameScreen from "../features/game/GameScreen";
import { getCharacter } from "../entities/character/characters";
import { getPieceSkin } from "../entities/piece-skins/pieceSkins";
import { getDifficultyPreset } from "../shared/config/difficulty";
import { targets } from "./engine";
import type { Challenge, Review } from "./types";
import { soundSystem } from "../shared/lib/soundSystem";

type Status = "playing" | "correct" | "retry";
export default function Puzzle({
  puzzle,
  onComplete,
  onBack,
  save,
  backLabel,
  isGuest = false,
}: {
  puzzle: Challenge | Review;
  onComplete: (result?: { attempts: number; assisted: boolean }) => void;
  save?: WorldSave;
  backLabel?: string;
  isGuest?: boolean;
  onBack: (solved: boolean) => void;
}) {
  const [core, setCore] = useState(() => new ChessCore(puzzle.fen));
  const [state, setState] = useState(core.getState());
  const [selected, setSelected] = useState<string | null>(
    "kind" in puzzle && puzzle.kind === "square"
      ? puzzle.solutions[0].slice(0, 2)
      : null
  );
  const [status, setStatus] = useState<Status>("playing");
  const [attempts, setAttempts] = useState(0);
  const [hint, setHint] = useState(false);
  const [victims, setVictims] = useState<string[]>([]);
  const [move, setMove] = useState<{ from: string; to: string }>();
  const [message, setMessage] = useState(
    "kind" in puzzle && puzzle.kind === "square"
      ? "Your knight is selected. Choose a square for the fork."
      : "kind" in puzzle && puzzle.kind === "choice"
      ? "Choose one of three moves."
      : "Choose a piece, then a destination square."
  );
  const [ready, setReady] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [round, setRound] = useState(0);
  const completion = useRef(false);
  const baseline = useRef({
    points: save?.mastery[puzzle.skill].points || 0,
    steps: save ? character(save).progress : 0,
  });
  const assisted = useRef(false);
  const kind = "kind" in puzzle ? puzzle.kind : "move";
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const player = new Chess(puzzle.fen).turn();
  const enemyFork =
    "id" in puzzle && puzzle.id === "fork-6" && puzzle.kind === "defend";
  useEffect(() => () => clearTimeout(timer.current), []);
  function reset() {
    clearTimeout(timer.current);
    const next = new ChessCore(puzzle.fen);
    setCore(next);
    setState(next.getState());
    setSelected(kind === "square" ? puzzle.solutions[0].slice(0, 2) : null);
    setStatus("playing");
    setVictims([]);
    setMove(undefined);
    setReady(false);
    setVideoBusy(false);
    setRound((r) => r + 1);
    setMessage("Try again. Find a move that meets the goal.");
  }
  function make(
    to: string,
    promotion?: "q" | "r" | "b" | "n",
    from = selected
  ) {
    if (!from || status !== "playing") return;
    const made = core.makeMove({ from, to, promotion });
    if (!made) return;
    const correct = puzzle.solutions.includes(
      from + to + (made.promotion || "")
    );
    const chess = new Chess(core.getFen());
    const p = chess.get(to as Square)!;
    const attacked = targets(chess, to as Square).filter((s) => {
      const v = chess.get(s);
      return (
        v && v.color !== p.color && (puzzle.skill !== "mate" || v.type === "k")
      );
    });
    setState(core.getState());
    setSelected(null);
    setMove({ from, to });
    setStatus(correct ? "correct" : "retry");
    if (correct) {
      setMessage(puzzle.explanation);
      if (!completion.current) {
        completion.current = true;
        onComplete({
          attempts: attempts + 1,
          assisted: assisted.current || hint,
        });
      }
      playWorldSound("success");
    } else {
      const count = attempts + 1;
      setAttempts(count);
      if (count >= 2) setHint(true);
      setMessage(
        kind === "defend"
          ? "Nearly! The threat remains. Protect both targets or remove the attacker."
          : puzzle.skill === "fork"
          ? attacked.length === 0
            ? "Nearly! Your piece is not attacking a target yet. Try another square."
            : attacked.length === 1
            ? "Nearly! Your piece attacks only one target. Find a square for two."
            : "You found two targets. Check whether your opponent can capture your piece or whether you must escape check."
          : "Nearly! The move is legal. Look at the goal and try another way."
      );
    }
    timer.current = setTimeout(() => {
      setVictims(attacked);
      setReady(true);
    }, 420);
  }
  const panel = (
    <div className={"lesson-panel " + status}>
      <div className={'turn-banner turn-'+state.fen.split(' ')[1]}>{state.fen.split(' ')[1]==='b'?"⚫ BLACK TO MOVE":"⚪ WHITE TO MOVE"}</div>
      <span className="lesson-number">
        {"id" in puzzle
          ? (puzzle.skill === "fork"
              ? "Chapter " +
                puzzle.chapter +
                " · " +
                chapters[(puzzle.chapter || 1) - 1] +
                " · "
              : "") +
            "Challenge " +
            (forSkill(puzzle.skill).findIndex((c) => c.id === puzzle.id) + 1) +
            " / " +
            forSkill(puzzle.skill).length
          : "YOUR GAME · MOVE " + Number(puzzle.fen.split(" ")[5])}
      </span>
      <h1>
        {status === "correct"
          ? "✓ Correct!"
          : status === "retry"
          ? "Nearly!"
          : "title" in puzzle
          ? puzzle.title
          : "Find a strong move"}
      </h1>
      <p className="lesson-prompt">
        {status === "playing" ? puzzle.prompt : message}
      </p>
      <div role="status" aria-live="polite" className="lesson-status">
        {status === "playing"
          ? message
          : status === "correct" &&
            (puzzle.skill === "fork" || puzzle.skill === "doubleAttack") &&
            kind !== "defend" &&
            victims.length >= 2
          ? "One piece → two targets"
          : ""}
      </div>
      {hint && status !== "correct" && (
        <p className="lesson-hint">
          Look closely at the piece on {puzzle.solutions[0].slice(0, 2)}.{" "}
          {enemyFork
            ? "Save your king from check."
            : puzzle.skill === "fork"
            ? "How can it attack two targets?"
            : "Think about the challenge’s goal."}
        </p>
      )}
      {kind === "choice" && status === "playing" && "choices" in puzzle && (
        <div className="move-choices">
          {puzzle.choices!.map((m) => (
            <button
              className="lesson-secondary"
              key={m}
              onClick={() => make(m.slice(2, 4), m[4] as any, m.slice(0, 2))}
            >
              {m.slice(0, 2)} → {m.slice(2, 4)}
            </button>
          ))}
        </div>
      )}
      {status === "correct" && save && (
        <div className="puzzle-growth" aria-label="Your progress">
          <Badge kind={puzzle.skill} />
          <strong>{save.mastery[puzzle.skill].points}%</strong>
          <progress max={100} value={save.mastery[puzzle.skill].points} />
          <span>
            +{save.mastery[puzzle.skill].points - baseline.current.points}% skill · +{character(save).progress - baseline.current.steps} hero steps
          </span>
        </div>
      )}
      <div className="lesson-actions">
        {status === "correct" && (
          <button
            className="world-button"
            disabled={!ready || videoBusy}
            onClick={() => onBack(true)}
          >
            {backLabel || "Return to the fortress"} →
          </button>
        )}
        {status === "retry" && (
          <button
            className="world-button"
            disabled={!ready || videoBusy}
            onClick={reset}
          >
            Try again →
          </button>
        )}
        {status === "playing" && (
          <>
            <button
              className="lesson-secondary"
              onClick={() => {
                assisted.current = true;
                setHint(true);
                setSelected(puzzle.solutions[0].slice(0, 2));
              }}
            >
              Hint
            </button>
          </>
        )}
        <button
          hidden={status === "correct"}
          className="lesson-back"
          disabled={status === "correct" && (!ready || videoBusy)}
          onClick={() => onBack(status === "correct")}
        >
          {backLabel || "Return to the fortress"}
        </button>
      </div>
    </div>
  );
  return (
    <section className="original-puzzle" aria-label="Chess challenge">
      <GameScreen
        key={round}
        gameState={state}
        isGuest={isGuest}
        playerColor={player}
        opponent={getCharacter("bear")}
        pieceSkin={getPieceSkin("default")}
        difficulty={getDifficultyPreset("level_1")}
        selectedSquare={selected}
        legalMoves={
          status === "playing" && selected ? core.getLegalMoves(selected) : []
        }
        onSelectSquare={(s) => {
          if (status === "playing") {
            if (kind === "square" && s !== puzzle.solutions[0].slice(0, 2))
              make(s, undefined, puzzle.solutions[0].slice(0, 2));
            else setSelected(s);
          }
        }}
        onMakeMove={make}
        onResign={() => onBack(false)}
        isEngineTurn={status !== "playing"}
        onAnimationBusyChange={setVideoBusy}
        training={{
          panel,
          targets: enemyFork && status === "playing" ? ["c4", "g4"] : victims,
          source:
            enemyFork && status === "playing"
              ? "e5"
              : ready
              ? move?.to
              : undefined,
          move,
          hint:
            hint && status === "playing"
              ? puzzle.solutions[0].slice(0, 2)
              : undefined,
        }}
      />
    </section>
  );
}
