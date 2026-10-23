import HeroAbility from "./HeroAbility";
import {weaponTier} from "./weapons";
import HeroActor from "./HeroActor";
import type { HeroId } from "./types";
export default function HeroTaskAction({
  hero,
  parts,
  solved,
  hits,
  guardian,
  durability = 100,
}: {
  hero: HeroId;
  parts: number;
  solved: boolean;
  hits: number;
  guardian: boolean;
  durability?: number;
}) {
  const total = guardian ? 2 : 3,
    left = Math.max(0, total - hits);
  return (
    <div
      className={"hero-task-action " + hero + (solved ? " task-hit" : "")}
      aria-live="polite"
    >
      <div className="task-actor">
        <HeroActor id={hero} parts={parts} attacking={solved} />
      </div>
      <i className="castle-hit-target" style={{position:"absolute",left:"70%",top:"25%"}} aria-hidden="true"/><HeroAbility hero={hero} tier={weaponTier(parts)} phase={solved?"fire":"idle"}/>
      <div className="task-gate">
        <div
          className="gate-illustration"
          data-damage={
            durability === 100
              ? 0
              : durability >= 70
              ? 1
              : durability >= 50
              ? 2
              : durability > 0
              ? 3
              : 4
          }
          aria-hidden="true"
        >
          <i />
          <i />
        </div>
        <strong>Fortress gates</strong>
        <span>Strength: {durability}%</span>
        <progress max={100} value={durability} />
        <small>
          Solve puzzles to weaken the gates. At 0%, the fortress is yours!
        </small>
        {guardian && <small>Guardian shields: {left} / 2</small>}
        {solved && <small>Hit! Your attack charge is ready.</small>}
      </div>
    </div>
  );
}
