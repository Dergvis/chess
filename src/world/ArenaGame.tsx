import { useEffect, useRef, useState } from "react";
import { ChessCore } from "../entities/chess/ChessCore";
import GameScreen from "../features/game/GameScreen";
import { getCharacter } from "../entities/character/characters";
import { getPieceSkin } from "../entities/piece-skins/pieceSkins";
import { getDifficultyPreset } from "../shared/config/difficulty";
import { engineRequest } from "./engineClient";
import type { GameRecord } from "./types";
import { worldKey } from "./accountStorage";
export const ACTIVE_KEY = "gosha-world-active-v1";
export const opponentIds = ["bear", "fox", "owl", "lion", "dragon"];
export const levelDescriptions = [
  "Getting to know the game",
  "Learning to spot threats",
  "Thinking about replies",
  "A serious opponent",
  "Grows with you",
];
export function loadActive(): GameRecord | null {
  try {
    const g = JSON.parse(localStorage.getItem(worldKey(ACTIVE_KEY)) || "null");
    if (!g?.id || !Array.isArray(g.moves) || !opponentIds.includes(g.opponent))
      return null;
    return g;
  } catch {
    return null;
  }
}
export default function ArenaGame({
  game,
  strength,
  onFinish,
  onPause,
  isGuest = false,
}: {
  game: GameRecord;
  strength: number;
  onFinish: (g: GameRecord) => void;
  onPause: () => void;
  isGuest?: boolean;
}) {
  const [core] = useState(() => {
    const c = new ChessCore();
    game.moves.forEach((m) => {
      if (!c.makeMove({ ...m, promotion: m.promotion as any }))
        throw new Error("The game record is damaged");
    });
    return c;
  });
  const [state, setState] = useState(core.getState()),
    [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [animationBusy, setAnimationBusy] = useState(false),
    [error, setError] = useState(""),
    [resign, setResign] = useState(false),
    [retry, setRetry] = useState(0);
  const record = useRef<GameRecord>(JSON.parse(JSON.stringify(game))),
    lastTime = useRef(Date.now()),
    mountedAt = useRef(Date.now());
  const over = core.isGameOver();
  const saveActive = () => {
    try {
      localStorage.setItem(
        worldKey(ACTIVE_KEY),
        JSON.stringify({
          ...record.current,
          duration: game.duration + Date.now() - mountedAt.current,
        })
      );
    } catch {
      setError("Could not save the game in this browser.");
    }
  };
  const make = (from: string, to: string, promotion?: string) => {
    const before = core.getFen(),
      m = core.makeMove({ from, to, promotion: promotion as any });
    if (!m) return;
    record.current.moves.push({
      from,
      to,
      promotion: m.promotion,
      before,
      after: core.getFen(),
      elapsed: Date.now() - lastTime.current,
    });
    lastTime.current = Date.now();
    setState(core.getState());
    setSelected(null);
    saveActive();
  };
  useEffect(() => {
    saveActive();
    const timer = setInterval(saveActive, 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (state.turn === game.playerColor || over || animationBusy) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    // Allow the existing capture pipeline to enter its video state before scheduling AI.
    const timer = setTimeout(() => {
      engineRequest<string | null>(
        { type: "move", fen: core.getFen(), level: game.level, strength },
        controller.signal
      )
        .then((move) => {
          if (!move || controller.signal.aborted) return;
          make(move.slice(0, 2), move.slice(2, 4), move[4]);
          setBusy(false);
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setBusy(false);
            setError("Your opponent is thinking. You can try again.");
          }
        });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [state.fen, animationBusy, retry]);
  function finish(surrender = false) {
    const winner = core.getWinner();
    const result = surrender
      ? "loss"
      : winner === "draw"
      ? "draw"
      : winner === game.playerColor
      ? "win"
      : "loss";
    onFinish({
      ...record.current,
      result,
      reason: surrender
        ? "resign"
        : state.isCheckmate
        ? "checkmate"
        : state.isStalemate
        ? "stalemate"
        : "draw",
      duration: game.duration + Date.now() - mountedAt.current,
    });
  }
  const difficulty = {
    ...getDifficultyPreset("level_1")!,
    displayName: `Opponent ${game.level} · ${
      levelDescriptions[game.level - 1]
    }`,
    uiAssistEnabled: true,
  };
  return (
    <div className="world-arena">
      <div className="arena-toolbar">
        <button
          className="text-button"
          onClick={() => {
            saveActive();
            onPause();
          }}
        >
          ← Map · save game
        </button>
        <span>ARENA · USE YOUR DISCOVERIES</span>
      </div>
      <GameScreen
        gameState={state}
        isGuest={isGuest}
        playerColor={game.playerColor}
        opponent={getCharacter(game.opponent)}
        pieceSkin={getPieceSkin("default")}
        difficulty={difficulty}
        selectedSquare={selected}
        legalMoves={selected ? core.getLegalMoves(selected) : []}
        onSelectSquare={(s) => {
          if (state.turn === game.playerColor && !animationBusy && !over)
            setSelected(s);
        }}
        onMakeMove={(to, promotion) => {
          if (
            selected &&
            state.turn === game.playerColor &&
            !animationBusy &&
            !over
          )
            make(selected, to, promotion);
        }}
        onResign={() => setResign(true)}
        isEngineTurn={state.turn !== game.playerColor || animationBusy || over}
        onAnimationBusyChange={setAnimationBusy}
      />
      {error && (
        <div className="arena-error" role="alert">
          {error}
          <button onClick={() => setRetry((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}
      {over && !animationBusy && (
        <div className="arena-end">
          <h2>
            {core.getWinner() === "draw"
              ? "A draw!"
              : core.getWinner() === game.playerColor
              ? "You won!"
              : "Thanks for the game!"}
          </h2>
          <button className="world-button" onClick={() => finish()}>
            Collect your discoveries →
          </button>
        </div>
      )}
      {resign && !over && (
        <div className="modal-scrim">
          <div className="world-dialog">
            <h2>End this game?</h2>
            <p>You can save it and continue later.</p>
            <button
              className="world-button"
              onClick={() => {
                setResign(false);
                saveActive();
                onPause();
              }}
            >
              Save and return to the map
            </button>
            <button className="text-button" onClick={() => finish(true)}>
              Resign and see the review
            </button>
            <button className="text-button" onClick={() => setResign(false)}>
              Keep playing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
