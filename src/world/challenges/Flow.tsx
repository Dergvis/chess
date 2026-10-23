import {seedExperience} from './adaptive';
import { learningStageNames, gateDurability } from "../siege";
import { useEffect, useRef, useState } from "react";
import type { WorldSave } from "../types";
import type { Attempt, Exercise } from "./types";
import { ensureLearning, stageNames, stagePlaces } from "./model";
import { selectExercise as adaptiveExercise } from "./selector";
import { calibrationExercise, exercisePool } from "./catalog";
import { recordAttempt } from "./progress";
import ChallengeSession from "./Session";
import TeachingExample from "./Example";
import { emit } from "../events";
import { mistyUnlocked } from "../journey";


export function PathPanel({
  save,
  skill,
  onStart,
  onMixed,
  onPersonal,
}: {
  save: WorldSave;
  skill: string;
  onStart: (practice?: boolean) => void;
  onMixed: () => void;
  onPersonal?: (id: string) => void;
}) {
  const p = ensureLearning(save).paths[skill],
    complete = p.completed.length === 4;
  return (
    <div className="mastery-path-panel">
      <span className="kingdom-kicker">
        {complete ? "FORTRESS FREED" : "YOUR ADVENTURE"}
      </span>
      <h1>
        {complete
          ? "You defeated the Guardian!"
          : p.chapter + ". " + learningStageNames(skill)[p.chapter - 1]}
      </h1>
      <p>
        {p.completed.length} / 4 stages · {"★".repeat(p.completed.length)}
        {"☆".repeat(4 - p.completed.length)}
      </p>
      <nav className="chapter-tabs">
        {learningStageNames(skill).map((name, i) => (
          <span
            key={name}
            className={
              p.completed.includes(i + 1)
                ? "path-done"
                : p.chapter === i + 1
                ? "path-current"
                : ""
            }
          >
            <b className="mobile-stage-name">{["♜ Learn","♟ Find","⚑ Create","♛ Guardian"][i]}</b>
            <strong>
              {i + 1}. {name}
            </strong>
            <small>
              {p.completed.includes(i + 1)
                ? "Completed ✓"
                : i + 1 > p.chapter
                ? "🔒 " + stagePlaces[i]
                : stagePlaces[i]}
            </small>
          </span>
        ))}
      </nav>
      <p>
        {complete
          ? "You changed this world. Your next adventure is waiting on the map."
          : [
              "First, watch a simple example and try with hints.",
              "Spot the tactic on the board yourself.",
              "Use your discovery in a real position.",
              "Use everything you have learned.",
            ][p.chapter - 1]}
      </p>
      <div className="kingdom-actions">
        <button className="world-button" onClick={() => onStart(false)}>
          {complete
            ? "Mastery challenge — a harder task"
            : p.completed.length || p.successes.length
            ? "Continue the journey"
            : "Start the journey"}{" "}
          →
        </button>

      </div>
    </div>
  );
}
export default function LearningFlow({
  save,
  skill = "fork",
  mode = "path",
  onSave,
  onBack,
  onChapter,
  isGuest = false,
  practice = false,
}: {
  save: WorldSave;
  skill?: string;
  mode: "path" | "mixed" | "calibration";
  onSave: (s: WorldSave) => void;
  onBack: () => void;
  onChapter: () => void;
  isGuest?: boolean;
  practice?: boolean;
}) {
  const l = ensureLearning(save);
  function selectExercise(
    state: typeof l,
    topic: string,
    kind: "path" | "mixed" | "checkpoint" = "path"
  ) {
    const training =
      practice && kind === "path"
        ? {
            ...state,
            paths: {
              ...state.paths,
              [topic]: {
                ...state.paths[topic],
                chapter: 1,
                completed: [],
                successes: [],
              },
            },
          }
        : state;
    return adaptiveExercise(training, topic, kind);
  }
  const [gateIntro,setGateIntro]=useState(mode==='path');
  useEffect(()=>{if(!gateIntro)return;const timer=setTimeout(()=>setGateIntro(false),1500);return()=>clearTimeout(timer);},[gateIntro]);
  const [guardianEntered, setGuardianEntered] = useState(false);
  const stageEvent = useRef(false);
  useEffect(() => {
    if (!stageEvent.current && mode === "path") {
      stageEvent.current = true;
      emit("stage_started", { skill, stage: l.paths[skill]?.chapter });
    }
  }, []);
  const [run, setRun] = useState(0),
    [context, setContext] = useState<Attempt["mode"]>(mode);
  const [example, setExample] = useState(
    mode === "path" &&
      l.paths[skill]?.chapter === 1 &&
      !l.attempts.some((a) => a.mode === "path" && a.skill === skill)
  );
  const [active, setActive] = useState<Exercise | null>(() =>
    mode === "calibration"
      ? calibrationExercise(l)
      : mode === "mixed" && !mistyUnlocked(save)
      ? null
      : selectExercise(l, skill, mode)
  );
  const [result, setResult] = useState<Attempt | null>(null),
    [checkpointCount, setCheckpointCount] = useState(0),
    [checkpointDone, setCheckpointDone] = useState(false);
  const [bossFirst, setBossFirst] = useState<Attempt | null>(null),
    [chapterBefore, setChapterBefore] = useState(
      l.paths[skill]?.completed.length || 0
    );
  const selectedExercise =
    active ||
    (mode === "mixed" && !mistyUnlocked(save)
      ? null
      : mode === "calibration"
      ? calibrationExercise(l)
      : selectExercise(l, skill, mode));
  if (!selectedExercise)
    return (
      <main className="activity-shell calibration-intro">
        <h1>Discoveries await in the mist</h1>
        <p>
          Complete some fortress challenges first. Here you will meet familiar tactics without being told the topic.
        </p>
        <button className="world-button" onClick={onBack}>
          To the fortresses →
        </button>
      </main>
    );
  const c = selectedExercise;
  function update(mutator: (s: WorldSave) => void) {
    const s = structuredClone(save);
    mutator(s);
    onSave(s);
    return s;
  }
  if (mode === "calibration" && !l.experience)
    return (
      <main className="activity-shell calibration-intro">
        <h1>Have you played chess before?</h1>
        <p>
          Choose what fits you. We will suggest a starting point for your adventure.
        </p>
        {(
          [
            ["new", "🌱 Just starting"],
            ["some", "♟ I know a little"],
            ["confident", "🔥 I play confidently"],
          ] as const
        ).map(([id, title]) => (
          <button
            className="world-button"
            key={id}
            onClick={() => {
              update((s) => {
                const state = ensureLearning(s);
                seedExperience(state,id);
                state.calibrated = true;
                state.globalSkillScore =
                  id === "new" ? 20 : id === "some" ? 40 : 80;
                Object.values(state.skills).forEach(
                  (m) =>
                    (m.difficulty = id === "new" ? 1 : id === "some" ? 2 : 4)
                );
              });
              emit("experience_selected", { experience: id });
              onBack();
            }}
          >
            {title}
          </button>
        ))}
      </main>
    );
  if(gateIntro)return <main className="activity-shell gate-brief"><h1>Fortress gates: {gateDurability(save,skill)}%</h1><p>Solve the challenges to prepare your strike.</p><progress max={100} value={gateDurability(save,skill)}/></main>;
  if (example && context === "path")
    return (
      <TeachingExample skill={skill} onContinue={() => setExample(false)} />
    );
  function receive(a: Attempt) {
    if (c.type === "BOSS" && !a.correct) {
      setResult(a);
      onSave(recordAttempt(save, c, { ...a, type: "MOVE" }));
      return;
    }
    // A guardian contains two distinct existing positions; the first hit cannot finish the fortress.
    if (c.type === "BOSS" && !bossFirst) {
      setResult(a);
      setBossFirst(a);
      onSave(recordAttempt(save, c, { ...a, type: "MOVE" }));
      return;
    }
    if (bossFirst && c.type === "BOSS")
      a = {
        ...a,
        correct: a.correct && bossFirst.correct,
        attempts: a.attempts + bossFirst.attempts - 1,
        hintLevel: Math.max(a.hintLevel, bossFirst.hintLevel),
        elapsedMs: a.elapsedMs + bossFirst.elapsedMs,
        depth: a.depth + bossFirst.depth,
        moves: [...bossFirst.moves, ...a.moves],
      };
    setResult(a);
    const next = recordAttempt(save, c, a);
    onSave(next);
  }
  function next() {
    if (c.type === "BOSS" && result && !result.correct) {
      setResult(null);
      setRun((n) => n + 1);
      return;
    }
    if (mode === "calibration") {
      if (l.calibrationIndex >= 6) {
        update((s) => {
          const state = ensureLearning(s);
          const rows = state.attempts.filter((a) => a.mode === "calibration");
          const score =
            rows.reduce(
              (n, a) =>
                n +
                (a.correct
                  ? (10 + a.difficulty * 17) *
                    a.quality *
                    (1 - a.hintLevel * 0.2)
                  : 0),
              0
            ) / Math.max(1, rows.length);
          state.globalSkillScore = Math.round(
            score * 0.8 + state.globalSkillScore * 0.2
          );
          state.calibrated = true;
          Object.values(state.skills).forEach(
            (m) =>
              (m.difficulty = Math.max(
                1,
                Math.min(5, Math.round(state.globalSkillScore / 20))
              ))
          );
        });
        onBack();
        return;
      }
      const s = update((s) => {
        ensureLearning(s).calibrationIndex++;
      });
      setActive(calibrationExercise(ensureLearning(s)));
    } else if (context === "checkpoint") {
      if (checkpointCount >= 1) {
        setCheckpointDone(true);
        return;
      }
      setCheckpointCount(1);
      setActive(selectExercise(l, skill, "checkpoint"));
    } else if (c.type === "BOSS" && bossFirst && result?.id === bossFirst.id) {
      const adaptiveSecond=selectExercise(l,skill);
      const second = adaptiveSecond.family!==c.family?adaptiveSecond:
        exercisePool.find(
          (e) =>
            e.reviewStatus!=="needing-review" && e.skill === skill &&
            e.type === "BOSS" &&
            e.chapter === c.chapter &&
            e.family !== c.family
        ) ||
        exercisePool.find(
          (e) => e.skill === skill && e.type === "BOSS" && e.family !== c.family
        );
      if (second) {
        setActive({
          ...second,
          chapter: c.chapter,
          pathSkill: skill,
          hidden: false,
          prompt:
            second.goal.kind === "material"
              ? "Gain an advantage and keep it until the challenge ends."
              : "Find a strong continuation.",
        });
        setResult(null);
        setRun((n) => n + 1);
        return;
      }
    } else if ((l.paths[skill]?.completed.length || 0) > chapterBefore) {
      onChapter();
      return;
    } else {
      setBossFirst(null);
      setActive(selectExercise(l, skill, mode));
    }
    setResult(null);
    setRun((n) => n + 1);
  }
  if (c.type === "BOSS" && !guardianEntered)
    return (
      <main className="activity-shell guardian-intro">
        <h1>FORTRESS GUARDIAN</h1>
        <p>Use everything you have learned.</p>
        <p aria-label="Guardian shields">🛡️ 🛡️</p>
        <button
          className="world-button"
          onClick={() => {
            setGuardianEntered(true);
            emit("guardian_started", { skill });
          }}
        >
          Start the battle →
        </button>
        <button className="lesson-back" onClick={onBack}>
          ← World map
        </button>
      </main>
    );
  return (
    <ChallengeSession
      key={c.id + "-" + run}
      exercise={c}
      mode={context}
      caption={
        mode === "calibration"
          ? `HERO CHALLENGE · ${l.calibrationIndex + 1} OF 7`
          : context === "checkpoint"
          ? `GUARDIAN CHALLENGE · ${checkpointCount + 1} OF 2`
          : c.type === "BOSS"
          ? `GUARDIAN BATTLE · ${
              bossFirst && bossFirst.challengeId !== c.id ? 2 : 1
            } OF 2`
          : mode === "path"
          ? `${c.chapter}. ${learningStageNames(skill)[c.chapter - 1]}`
          : undefined
      }
      onResult={receive}
      continueLabel={
        (l.paths[skill]?.completed.length || 0) > chapterBefore
          ? "Test your hero’s strength →"
          : "Continue →"
      }
      onContinue={next}
      onExit={onBack}
      isGuest={isGuest}
    />
  );
}
