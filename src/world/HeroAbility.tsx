import {heroConfig} from "./heroConfig";
import { useLayoutEffect, useRef, useState } from "react";
import type { HeroId } from "./types";
import { attackTiming } from "./weapons";
type Point = { x: number; y: number };
export default function HeroAbility({
  hero,
  phase,
  tier = 1,
}: {
  hero: HeroId;
  phase: string;
  tier?: number;
}) {
  const ref = useRef<SVGSVGElement>(null),
    [points, setPoints] = useState<{ sources: Point[]; target: Point }>({
      sources: [],
      target: { x: 660, y: 390 },
    });
  useLayoutEffect(() => {
    const stage = ref.current?.parentElement;
    if (!stage) return;
    let raf = 0;
    const measure = () => {
      const r = stage.getBoundingClientRect(),
        target = stage
          .querySelector(".castle-hit-target")
          ?.getBoundingClientRect();
      const sources = [
        ...(stage.querySelector(".upgrade-new") || stage).querySelectorAll(
          ".weapon-anchor"
        ),
      ].map((el) => {
        const p = el.getBoundingClientRect();
        return {
          x: ((p.left + p.width / 2 - r.left) / r.width) * 1000,
          y: ((p.top + p.height / 2 - r.top) / r.height) * 666.667,
        };
      });
      if (target && sources.length)
        setPoints({
          sources,
          target: {
            x: ((target.left - r.left) / r.width) * 1000,
            y: ((target.top - r.top) / r.height) * 666.667,
          },
        });
      if (["aim", "charge"].includes(phase))
        raf = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [hero, phase, tier]);
  const origin = points.sources[0],
    target = points.target;
  if (!origin) return <svg ref={ref} className="hero-ability" />;
  const { x, y } = origin,
    { x: tx, y: ty } = target,
    power = 1 + tier * 0.25,
    timing = attackTiming(hero, tier);
  const rocketPath = `M${x},${y} C${x + 80},${y - 62} ${tx - 80},${
    ty - 80
  } ${tx},${ty}`;
  const bolt = Array.from({ length: 33 }, (_, i) => {
    const t = i / 32,
      jitter =
        i === 0 || i === 32
          ? 0
          : ((Math.sin(i * 12.9898) * 43758.5453) % 1) * (5 + tier * 1.7);
    return `${x + (tx - x) * t},${y + (ty - y) * t + jitter}`;
  }).join(" ");
  return (
    <svg
      key={phase}
      ref={ref}
      className={`hero-ability weapon-fx ability-${hero} phase-${phase}`}
      viewBox="0 0 1000 666.667"
      preserveAspectRatio="none"
      data-ability={
        hero === "knight" ? "rocket" : hero === "mage" ? "lightning" : "laser"
      }
      data-power={tier}
      data-attack-origin={heroConfig[hero].attackOrigin}
      aria-label="Hero attack"
    >
      {phase === "charge" &&
        points.sources.map((p, i) => (
          <g key={i} className="weapon-charge" data-source={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4 + tier}
              fill={hero === "mage" ? "#b3f5ff" : "#ffedba"}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={10 + tier * 2}
              fill="none"
              stroke={hero === "mage" ? "#58caff" : "#ffba37"}
              strokeWidth="2"
            />
            {hero === "mage" &&
              [0, 1, 2].map((n) => (
                <path
                  key={n}
                  d={`M${p.x - 15 + n * 8} ${p.y - 22}l-6 8l12 4l-7 13`}
                  stroke="#9becff"
                  fill="none"
                  strokeWidth="2"
                />
              ))}
          </g>
        ))}
      {phase === "fire" && hero === "inventor" && (
        <g className="laser-beam">
          {points.sources.slice(0, tier>=5?2:1).map((p, i) => (
            <g key={i} data-eye={i}>
              <line
                x1={p.x}
                y1={p.y}
                x2={tx + i * 5}
                y2={ty + i * 4}
                stroke="#ff7513"
                strokeWidth={tier===2?3:3 + tier * 2}
              />
              <line
                x1={p.x}
                y1={p.y}
                x2={tx + i * 5}
                y2={ty + i * 4}
                stroke="#fff9d7"
                strokeWidth={1 + tier * 0.55}
              />
              <circle cx={p.x} cy={p.y} r={3 + tier} fill="#fff6b3" />
            </g>
          ))}
        </g>
      )}
      {phase === "fire" && hero === "mage" && (
        <g className="lightning-bolt">
          <polyline
            points={bolt}
            fill="none"
            stroke="#268cff"
            strokeWidth={4 + tier * 1.3}
          />
          <polyline
            points={bolt}
            fill="none"
            stroke="#ecffff"
            strokeWidth={1 + tier * 0.5}
          />
          {tier >= 3 &&
            [0.35, 0.55, 0.75].map((t, i) => (
              <path
                key={t}
                d={`M${x + (tx - x) * t},${y + (ty - y) * t}l${14 + i * 8},${
                  -20 - i * 6
                }l-9,-7l20,-18`}
                fill="none"
                stroke="#a2f4ff"
                strokeWidth={tier * 0.6}
              />
            ))}
        </g>
      )}
      {phase === "fire" && hero === "knight" && (
        <g className="rocket-flight">
          <path
            d={rocketPath}
            fill="none"
            stroke="#dedcd09c"
            strokeWidth={3 + tier}
            strokeDasharray="1000"
            pathLength="1000"
            className="rocket-smoke-path"
            style={{ animationDuration: timing.flight + "ms" }}
          />
          <g
            className="muzzle-flash"
            transform={`translate(${x} ${y}) rotate(-38)`}
          >
            <path
              d="M0 0L27 -12L18 -3L38 0L18 4L27 13Z"
              fill="#fff1ac"
              transform={`scale(${power})`}
            />
            <circle r={8 + tier} fill="#ffc45aaa" />
          </g>
          <g className="flying-rocket">
            <animateMotion
              dur={timing.flight + "ms"}
              fill="freeze"
              rotate="auto"
              path={rocketPath}
            />
            <g transform={`scale(${0.7 + tier * 0.15})`}>
              <path
                d="M-15 -5H7L18 0L7 5H-15Z"
                fill="#273d43"
                stroke="#f4c770"
                strokeWidth="2"
              />
              <path d="M-15 -3L-33 0L-15 3" fill="#ff921f" />
              <path d="M-15 -2L-25 0L-15 2" fill="#fff2ba" />
              <path
                d="M-8 -5L-16 -11L-15 -4M-8 5L-16 11L-15 4"
                fill="#ddab53"
              />
            </g>
          </g>
        </g>
      )}
      {phase === "impact" && (
        <g
          className={"impact-burst impact-" + hero}
          transform={`translate(${tx} ${ty})`}
          data-impact-target="castle"
        >
          <circle
            r={12 + tier * 5}
            fill={hero === "mage" ? "#d8ffff" : "#fff0b4"}
            className="impact-flash"
          />
          <circle
            r={17 + tier * 6}
            fill="none"
            stroke={hero === "mage" ? "#68d5ff" : "#ffbb52"}
            strokeWidth={4 + tier}
            className="impact-ring"
          />
          {Array.from({ length: 12 + tier * 3 }, (_, i) => {
            const angle = i * 2.4,
              dx = Math.cos(angle) * (30 + tier * 13),
              dy = Math.sin(angle) * (30 + tier * 11);
            return (
              <g
                key={i}
                className="impact-chip"
                style={
                  {
                    "--dx": dx + "px",
                    "--dy": dy + "px",
                  } as React.CSSProperties
                }
              >
                <path
                  d="M-3 -2L3 -4L5 2L0 5L-4 2Z"
                  fill={i % 2 ? "#c6b596" : "#8f8068"}
                />
              </g>
            );
          })}
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse
              className="impact-smoke"
              key={i}
              cx={(i - 2) * 14}
              cy={(i % 2) * 10}
              rx={12 + tier * 3}
              ry={9 + tier * 2}
              fill="#cec6b7"
              style={{ animationDelay: i * 50 + "ms" }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
