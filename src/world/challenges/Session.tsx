import {taskPresentation} from './presentation';
import TacticDemo from './TacticDemo';
import './taskUX.css';
import PieceGuide from "../PieceGuide";
import { useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessCore } from "../../entities/chess/ChessCore";
import GameScreen from "../../features/game/GameScreen";
import { getCharacter } from "../../entities/character/characters";
import { getPieceSkin } from "../../entities/piece-skins/pieceSkins";
import { getDifficultyPreset } from "../../shared/config/difficulty";
import { engineRequest } from "../engineClient";
import { detectSkills, values, uci, applyUci } from "../engine";
import { playWorldSound } from "../worldSound";
import type { Attempt, Exercise } from "./types";
import { topics } from "./catalog";
import { emit } from "../events";
import type { CandidateProof } from "./acceptance";
import { matchesObjective } from "./acceptance";
const material = (b: Chess, color: string) =>
  b
    .board()
    .flat()
    .reduce(
      (n, p) =>
        n +
        (p && p.type !== "k"
          ? (p.color === color ? 1 : -1) * values[p.type]
          : 0),
      0
    );
export default function ChallengeSession({
  exercise: c,
  mode,
  onResult,
  onContinue,
  onExit,
  isGuest = false,
  caption,
  continueLabel = "Continue →",
}: {
  exercise: Exercise;
  mode: Attempt["mode"];
  onResult: (a: Attempt) => void;
  onContinue: () => void;
  onExit: () => void;
  isGuest?: boolean;
  caption?: string;
  continueLabel?: string;
}) {
  const startedEvent = useRef(false);
  useEffect(() => { document.querySelector('.mobile-shell-content')?.scrollTo(0,0); }, []);
  useEffect(() => {
    if (!startedEvent.current) {
      startedEvent.current = true;
      emit("puzzle_started", { id: c.id, mode });
    }
  }, []);
  const [core, setCore] = useState(() => new ChessCore(c.fen)),
    [board, setBoard] = useState(core.getState());
  const [selected, setSelected] = useState<string | null>(
    c.type === "CHOOSE_SQUARE" ? c.solutions[0].slice(0, 2) : null
  );
  const [picked, setPicked] = useState<string[]>([]),
    [hints, setHints] = useState(0),
    [status, setStatus] = useState<
      "playing" | "retry" | "correct" | "finished"
    >("playing");
  const [videoBusy, setVideoBusy] = useState(false),
    [hintBusy, setHintBusy] = useState(false),
    [hintMove, setHintMove] = useState<{ fen: string; move: string } | null>(
      null
    ),
    [scoring, setScoring] = useState(false),
    [botError, setBotError] = useState(false),
    [retry, setRetry] = useState(0),
    [round, setRound] = useState(0);
  const attempts = useRef(1),
    moves = useRef<string[]>([]),
    errors = useRef<string[]>([]),
    ownMoves = useRef(0),
    foundFork = useRef(false),
    foundObjective = useRef(false),
    done = useRef(false);
  const grades = useRef<
      Promise<{
        move: string;
        loss: number;
        depth: number;
        validated?: boolean;
      } | null>[]
    >([]),
    alive = useRef(true),
    gradeAbort = useRef(new AbortController());
  useEffect(() => {
    alive.current = true;
    gradeAbort.current = new AbortController();
    return () => {
      alive.current = false;
      gradeAbort.current.abort();
    };
  }, []);
  const initialMaterial = useRef(material(new Chess(c.fen), c.player)),
    clock = useRef({
      active: 0,
      since: performance.now(),
      hidden: document.hidden,
    });
  const [message, setMessage] = useState("");
  const [proof, setProof] = useState<CandidateProof | null>(null),
    [proofError, setProofError] = useState(false),
    [proofRetry, setProofRetry] = useState(0);
  useEffect(() => {
    if (
      !c.sourceRef?.startsWith("validated:") ||
      (c.goal.kind !== "move" && c.type !== "MULTI_STEP")
    )
      return;
    const abort = new AbortController();
    setProof(null);
    setProofError(false);
    engineRequest<CandidateProof>(
      { type: "candidates", exercise: c },
      abort.signal
    )
      .then((p) => {
        if (abort.signal.aborted) return;
        if (!p.acceptable.length) {
          setProofError(true);
          return;
        }
        setProof(p);
        // The time spent checking the diagram is not time spent solving it.
        clock.current.since = performance.now();
      })
      .catch(() => {
        if (!abort.signal.aborted) setProofError(true);
      });
    return () => abort.abort();
  }, [c.id, proofRetry]);
  const preparing =
    !!c.sourceRef?.startsWith("validated:") &&
    (c.goal.kind === "move" || c.type === "MULTI_STEP") &&
    !proof;
  const accepted = proof?.acceptable || c.solutions;
  const targetMode = c.goal.kind === "targets",
    multi = c.goal.kind !== "move" && !targetMode;
  const chess = new Chess(board.fen),
    legal = chess.moves({ verbose: true });
  let preparedContinuation: string | undefined;
  if (c.line) {
    const replay = new Chess(c.fen);
    for (const move of c.line) {
      if (replay.fen() === board.fen && replay.turn() === c.player) {
        preparedContinuation = move;
        break;
      }
      applyUci(replay, move);
    }
  }
  const candidate =
    hintMove?.fen === board.fen
      ? hintMove.move
      : preparedContinuation ||
        (ownMoves.current === 0
          ? accepted.includes(c.solutions[0])
            ? c.solutions[0]
            : accepted[0]
          : uci(
              [...legal].sort(
                (a, b) =>
                  (values[b.captured || ""] || 0) -
                  (values[a.captured || ""] || 0)
              )[0] || { from: "", to: "" }
            ));
  const hintSource =
    c.goal.kind === "targets" ? c.goal.source : candidate?.slice(0, 2);
  const targetSquares = c.goal.kind === "targets" ? c.goal.squares : [];
  const narrowed =
    c.goal.kind === "targets"
      ? [
          ...new Set([
            ...targetSquares,
            ...chess
              .board()
              .flat()
              .filter(
                (p) =>
                  p &&
                  p.square !== hintSource &&
                  !targetSquares.includes(p.square)
              )
              .slice(0, 2)
              .map((p) => p!.square),
          ]),
        ]
      : [
          ...new Set([
            candidate?.slice(2, 4),
            ...legal.filter((m) => m.from === hintSource).map((m) => m.to),
          ]),
        ]
          .filter(Boolean)
          .slice(0, 4);
  useEffect(() => {
    const visibility = () => {
      const now = performance.now();
      if (!clock.current.hidden)
        clock.current.active += now - clock.current.since;
      clock.current.since = now;
      clock.current.hidden = document.hidden;
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  async function finish(correct: boolean) {
    if (done.current) return;
    emit(correct ? "puzzle_solved" : "puzzle_failed", { id: c.id, mode });
    done.current = true;
    setStatus(correct ? "correct" : "finished");
    setScoring(true);
    if (correct) playWorldSound("success");
    const elapsedMs = Math.round(
      clock.current.active +
        (clock.current.hidden ? 0 : performance.now() - clock.current.since)
    );
    const evaluations = (await Promise.all(grades.current)).filter(
      (
        x
      ): x is {
        move: string;
        loss: number;
        depth: number;
        validated?: boolean;
      } => !!x && x.depth > 0
    );
    if (!alive.current) return;
    onResult({
      id: crypto.randomUUID(),
      challengeId: c.id,
      family: c.family,
      skill: c.skill,
      pathSkill: c.pathSkill,
      subskill: c.subskill,
      scaffolding: c.scaffolding,
      type: c.type,
      chapter: c.chapter,
      correct,
      attempts: attempts.current,
      elapsedMs,
      hintLevel: hints,
      hidden: !!c.hidden,
      difficulty: c.difficulty,
      difficultyTier:c.difficultyTier,
      solutionDepth:c.solutionDepth,
      depth: Math.max(1, ownMoves.current),
      moves: [...moves.current],
      errors: [...errors.current],
      evaluations,
      quality: correct
        ? evaluations.length
          ? evaluations.reduce(
              (n, e) => n + (e.validated ? 1 : Math.max(0, 1 - e.loss / 400)),
              0
            ) / evaluations.length
          : Math.max(0, 1 - errors.current.length / (moves.current.length + 1))
        : 0,
      at: Date.now(),
      mode,
    });
    setScoring(false);
  }
  async function leave() {
    if (scoring) return;
    if (
      !done.current &&
      (moves.current.length || errors.current.length || hints || picked.length)
    ) {
      errors.current.push("exit");
      await finish(false);
    }
    if (alive.current) onExit();
  }
  async function requestHint() {
    emit("hint_used", { id: c.id });
    if (hintBusy || hints >= 3) return;
    if (
      multi &&
      hints >= 1 &&
      ownMoves.current > 0 &&
      !preparedContinuation &&
      hintMove?.fen !== board.fen
    ) {
      setHintBusy(true);
      try {
        const move = await engineRequest<string | null>(
          { type: "hint", fen: board.fen },
          gradeAbort.current.signal
        );
        if (!alive.current) return;
        if (move) {
          setHintMove({ fen: board.fen, move });
          setSelected(move.slice(0, 2));
        }
      } catch {
        if (alive.current)
          setMessage("The hint has not loaded yet. Try again.");
        return;
      } finally {
        if (alive.current) setHintBusy(false);
      }
    } else if (hints >= 1 && !targetMode && hintSource) setSelected(hintSource);
    setHints((n) => Math.min(3, n + 1));
  }
  function evaluateEnd(b: Chess) {
    const goal = c.goal;
    const won = b.isCheckmate() && b.turn() !== c.player;
    const completed =
      won ||
      (goal.kind === "material" &&
        b.turn() === c.player &&
        ownMoves.current >= goal.minMoves &&
        material(b, c.player) - initialMaterial.current >= goal.gain &&
        (!goal.requireFork || foundFork.current) &&
        (!goal.requireObjective || foundObjective.current)) ||
      (goal.kind === "promotion" &&
        moves.current.some((m, i) => i % 2 === 0 && m.length === 5) &&
        ownMoves.current >= goal.minMoves) ||
      (goal.kind === "survive" &&
        b.turn() === c.player &&
        ownMoves.current >= goal.minMoves &&
        material(b, c.player) - initialMaterial.current >= -goal.maxLoss &&
        !b.inCheck());
    if (completed) {
      finish(true);
      return;
    }
    if (
      b.isGameOver() ||
      (multi &&
        "maxMoves" in goal &&
        ownMoves.current >= goal.maxMoves &&
        b.turn() === c.player)
    ) {
      setMessage(
        "The goal was not reached this time. Explore a similar position and try again."
      );
      finish(false);
    }
  }
  function make(from: string, to: string, promotion?: string, bot = false) {
    if (
      done.current ||
      status !== "playing" ||
      videoBusy ||
      hintBusy ||
      preparing
    )
      return;
    const before = core.getFen(),
      b = new Chess(before);
    let made;
    try {
      made = b.move({ from, to, promotion });
    } catch {
      return;
    }
    if (!made) return;
    const move = uci(made);
    moves.current.push(move);
    if (!bot) {
      const validated =
        (!multi && accepted.includes(move)) ||
        (ownMoves.current === 0 && accepted.includes(move)) ||
        move === preparedContinuation;
      grades.current.push(
        engineRequest<{ move: string; loss: number; depth: number }>(
          { type: "grade", fen: before, move },
          gradeAbort.current.signal
        )
          .then((e) => ({ ...e, validated }))
          .catch(() => null)
      );
      ownMoves.current++;
      if (detectSkills(before, b.fen(), to).includes("fork"))
        foundFork.current = true;
      if (
        c.goal.kind === "material" &&
        c.goal.requireObjective &&
        matchesObjective(before, move, c.goal.requireObjective)
      )
        foundObjective.current = true;
      if (
        (!multi || (c.type === "MULTI_STEP" && ownMoves.current === 1)) &&
        !accepted.includes(move)
      ) {
        errors.current.push(move);
        emit("puzzle_failed", { id: c.id, reason: "move" });
        attempts.current++;
        setStatus("retry");
        setMessage(
          taskPresentation(c,before,ownMoves.current-1).hints[Math.min(2,attempts.current-2)]
        );
        core.makeMove({ from, to, promotion: promotion as any });
        setBoard(core.getState());
        setSelected(null);
        return;
      }
    }
    core.makeMove({ from, to, promotion: promotion as any });
    setBoard(core.getState());
    setSelected(null);
    if (!multi && !bot) {
      finish(true);
      return;
    }
    evaluateEnd(b);
  }
  useEffect(() => {
    if (
      !multi ||
      board.turn === c.player ||
      status !== "playing" ||
      videoBusy ||
      done.current
    )
      return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      engineRequest<string | null>(
        c.sourceRef?.startsWith("validated:")
          ? { type: "challengeReply", fen: board.fen }
          : { type: "move", fen: board.fen, level: 3, strength: 38 },
        abort.signal
      )
        .then((m) => {
          if (abort.signal.aborted) return;
          if (m) make(m.slice(0, 2), m.slice(2, 4), m[4], true);
          else evaluateEnd(new Chess(board.fen));
        })
        .catch((e) => {
          if (e.name !== "AbortError") setBotError(true);
        });
    }, 1100);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [board.fen, videoBusy, status, retry]);
  function reset() {
    const next = new ChessCore(c.fen);
    setCore(next);
    setBoard(next.getState());
    setSelected(c.type === "CHOOSE_SQUARE" ? c.solutions[0].slice(0, 2) : null);
    setPicked([]);
    ownMoves.current = 0;
    foundFork.current = false;
    foundObjective.current = false;
    setStatus("playing");
    setMessage("");
    setVideoBusy(false);
    setRound((n) => n + 1);
  }
  const view = taskPresentation(c,board.fen,ownMoves.current,status==='correct',{forkCreated:foundFork.current});
  const recognizingMate=view.taskType==='recognize_mate';
  function recognize(answer:boolean){if(answer===chess.isCheckmate())finish(true);else{attempts.current++;errors.current.push('recognition');setMessage("Check every escape: move away, block or capture the attacker.");}}
  const header=(<div className="training-task-header lesson-panel">
    <span className="lesson-number">{caption||"CHESS CHALLENGE"}</span>
    <h1>{status==='correct'?(chess.isCheckmate()?"Checkmate!":"You did it!"):status==='retry'?"Nearly! "+view.title:view.title}</h1>
    <p className="task-instruction">{status==='correct'?view.success:message||view.instruction}</p>
    {view.step&&status==='playing'&&<p className="task-step" role="status">{view.step}</p>}
    <div className="task-tools"><div className={'turn-banner turn-'+board.turn}>{chess.isCheckmate()?"Position finished · checkmate":(board.turn==='b'?"⚫ Black to move":"⚪ White to move")+(targetMode?" · just choose an answer":'')}</div>
    {!(c.type==='MIXED'&&status!=='correct')&&<TacticDemo key={c.id+'-'+status} kind={view.demo} expanded={(c.chapter===1||status==='correct')&&!window.matchMedia('(max-width:767px), (max-width:960px) and (max-height:500px)').matches} resultFen={status==='correct'?board.fen:undefined}/>}</div>
  </div>);
  const reveal = c.hidden && status === "correct";
  const panel = (
    <div
      className="lesson-panel challenge-panel"
      data-challenge-type={c.type}
      data-exercise-id={c.id}
      data-task-type={view.taskType}
      data-difficulty-tier={c.difficultyTier||c.difficulty}
      data-status={status}
      data-input-ready={
        status === "playing" &&
        !videoBusy &&
        !hintBusy &&
        !preparing &&
        (targetMode || board.turn === c.player)
      }
    >
      {preparing && (
        <p role="status">
          {proofError ? "Could not check this position." : "Preparing your challenge…"}
          {proofError && (
            <button onClick={() => setProofRetry((n) => n + 1)}>
              Check again
            </button>
          )}
        </p>
      )}
      {false &&
        status === "correct" &&
        c.type === "BOSS" &&
        (hints > 0 || attempts.current > 1) && (
          <p>
            You solved it with help. To open the next chapter, beat the Guardian without hints or retries.
          </p>
        )}
      {reveal && (
        <p className="motif-reveal">
          You spotted the tactic: {topics.get(c.skill)?.name || c.skill}.
        </p>
      )}

      {hints>0&&status==='playing'&&<p className="lesson-hint" role="status">{view.hints[Math.min(2,hints-1)]}{hints>=2&&!targetMode?" Look closely at the highlighted piece.":''}{hints>=3&&!targetMode?" Compare the squares marked in gold.":''}</p>}
      {recognizingMate&&status==='playing'&&<div className="mate-recognition"><button className="world-button" onClick={()=>recognize(true)}>It is checkmate</button><button className="lesson-secondary" onClick={()=>recognize(false)}>The king can escape</button></div>}
      {targetMode && !recognizingMate && status === "playing" && (
        <>
          <p>Selected: {picked.length}</p>
          <button
            className="world-button"
            disabled={!picked.length}
            onClick={() => {
              const expected = c.goal.kind === "targets" ? c.goal.squares : [];
              if (
                picked.length === expected.length &&
                picked.every((s) => expected.includes(s))
              )
                finish(true);
              else {
                emit("puzzle_failed", { id: c.id, reason: "targets" });
                errors.current.push("targets:" + picked.join(","));
                attempts.current++;
                setMessage(
                  view.hints[Math.min(2,attempts.current-2)]
                );
                setPicked([]);
              }
            }}
          >
            Check my choices
          </button>
        </>
      )}
      {c.type === "CHOOSE_MOVE" && status === "playing" && !preparing && (
        <div className="move-choices">
          {c.choices?.map((m) => (
            <button
              className="lesson-secondary"
              key={m}
              onClick={() => make(m.slice(0, 2), m.slice(2, 4), m[4])}
            >
              {m.slice(0, 2)} → {m.slice(2, 4)}
              {m[4] ? " · promotion" : ""}
            </button>
          ))}
        </div>
      )}
      {botError && (
        <p role="alert">
          Your opponent is thinking.{" "}
          <button
            onClick={() => {
              setBotError(false);
              setRetry((n) => n + 1);
            }}
          >
            Retry the reply
          </button>
        </p>
      )}
      <div className="lesson-actions">
        {status === "playing" && c.type !== "BOSS" && (
          <button
            className="lesson-secondary"
            disabled={
              hints >= 3 ||
              preparing ||
              hintBusy ||
              videoBusy ||
              (!targetMode && board.turn !== c.player)
            }
            onClick={requestHint}
          >
            {hintBusy
              ? "Preparing a hint…"
              : `Hint${hints ? ` ${hints}/3` : ""}`}
          </button>
        )}
        {status === "retry" && (
          <button className="world-button" disabled={videoBusy} onClick={reset}>
            Try once more
          </button>
        )}
        {(status === "correct" || status === "finished") && (
          <button
            className="world-button"
            disabled={videoBusy || scoring}
            onClick={onContinue}
          >
            {continueLabel}
          </button>
        )}
        <PieceGuide initialOpen={false}/>
        {!done.current && (
          <button
            className="lesson-back"
            disabled={videoBusy}
            onClick={() => {
              errors.current.push("skip");
              setMessage("We will return to this tactic later.");
              finish(false);
            }}
          >
            {mode === "calibration" ? "I am not sure yet" : "I need more practice"}
          </button>
        )}
        <button
          className="lesson-back"
          disabled={videoBusy || scoring}
          onClick={leave}
        >
          ← World map
        </button>
      </div>

    </div>
  );
  return (
    <section
      className="original-puzzle"
      aria-label="Chess challenge"
      data-fen={board.fen}
    >
      <GameScreen
        key={round}
        gameState={board}
        playerColor={c.fen.split(" ")[1] === "b" ? "b" : "w"}
        opponent={getCharacter("bear")}
        pieceSkin={getPieceSkin("default")}
        difficulty={getDifficultyPreset("level_1")}
        selectedSquare={selected}
        legalMoves={
          selected && !targetMode && status === "playing"
            ? core.getLegalMoves(selected)
            : []
        }
        onSelectSquare={(s) => {
          if (status === "playing")
            setSelected(
              c.type === "CHOOSE_SQUARE" ? c.solutions[0].slice(0, 2) : s
            );
        }}
        onMakeMove={(to, p) => {
          if (selected) make(selected, to, p);
        }}
        onResign={leave}
        isEngineTurn={
          recognizingMate ||
          preparing ||
          hintBusy ||
          status !== "playing" ||
          (!targetMode && board.turn !== c.player)
        }
        isGuest={isGuest}
        onAnimationBusyChange={setVideoBusy}
        training={{
          header,
          panel,
          targets: targetMode ? picked : view.highlights,
          candidates: hints >= 3 ? narrowed : [],
          source: targetMode ? c.source : undefined,
          hint: hints >= 2 ? hintSource : undefined,
          onSquare: targetMode && !recognizingMate
            ? (s) => {
                if (status === "playing" && chess.get(s as Square))
                  setPicked((p) =>
                    p.includes(s) ? p.filter((x) => x !== s) : [...p, s]
                  );
              }
            : undefined,
        }}
      />
    </section>
  );
}
