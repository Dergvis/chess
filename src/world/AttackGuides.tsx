import { useLayoutEffect, useRef, useState } from "react";

/** Coordinates come from the original board cells, including black orientation. */
export default function AttackGuides({
  from,
  targets,
}: {
  from?: string;
  targets: string[];
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [lines, setLines] = useState<number[][]>([]);
  useLayoutEffect(() => {
    const board = ref.current?.parentElement;
    if (!board) return;
    const measure = () => {
      const rect = board.getBoundingClientRect();
      const point = (square: string) => {
        const cell = board
          .querySelector(`[data-square="${square}"]`)
          ?.getBoundingClientRect();
        return cell
          ? [
              cell.left - rect.left + cell.width / 2,
              cell.top - rect.top + cell.height / 2,
            ]
          : null;
      };
      const start = from && point(from);
      setLines(
        start
          ? targets.flatMap((t) => {
              const end = point(t);
              return end ? [[...start, ...end]] : [];
            })
          : []
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    return () => observer.disconnect();
  }, [from, targets.join(",")]);
  return (
    <svg ref={ref} className="attack-guides" aria-hidden="true">
      <defs>
        <marker
          id="lesson-arrow"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path d="M0 0L7 3.5L0 7Z" fill="#ffe18b" />
        </marker>
      </defs>
      {lines.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#ffe18b"
          strokeWidth="4"
          strokeDasharray="7 6"
          markerEnd="url(#lesson-arrow)"
        />
      ))}
    </svg>
  );
}
