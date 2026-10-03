import { useId } from "react";
export type BadgeKind =
  | "fork"
  | "doubleAttack"
  | "defense"
  | "mate"
  | "pin"
  | "hero"
  | "games"
  | "wins"
  | "puzzles"
  | "castle"
  | "star";
export default function Badge({
  kind,
  className = "",
}: {
  kind: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={"game-badge " + className}
      viewBox="0 0 100 112"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id + "g"} x2=".8" y2="1">
          <stop stopColor="#ffedaf" />
          <stop offset=".45" stopColor="#d8a343" />
          <stop offset="1" stopColor="#81551f" />
        </linearGradient>
        <linearGradient id={id + "b"} x2="1" y2="1">
          <stop stopColor="#2c6675" />
          <stop offset="1" stopColor="#112c40" />
        </linearGradient>
      </defs>
      <path
        d="M50 3L92 19V62Q89 91 50 108Q11 91 8 62V19Z"
        fill={`url(#${id}g)`}
      />
      <path
        d="M50 11L84 25V61Q80 84 50 98Q20 84 16 61V25Z"
        fill={`url(#${id}b)`}
        stroke="#f3d17b"
      />
      <g fill="#f5d487" stroke="#d19a42" strokeWidth="2" strokeLinejoin="round">
        {kind === "fork" ? (
          <path d="M29 78H73V70H64L66 56Q72 33 55 25L49 18L46 29L33 36L25 52L35 58L43 49L47 49L35 66Z" />
        ) : kind === "mate" ? (
          <>
            <path d="M29 77H73L68 68H34ZM36 62L30 43L40 49L50 37L61 49L70 43L64 62Z" />
            <path d="M50 25V41M43 31H57" fill="none" strokeWidth="5" />
          </>
        ) : kind === "defense" ? (
          <>
            <path d="M50 28L70 37V54Q67 68 50 78Q33 68 30 54V37Z" />
            <path
              d="M39 51L47 59L62 43"
              fill="none"
              stroke="#234c5a"
              strokeWidth="5"
            />
          </>
        ) : kind === "pin" ? (
          <>
            <path d="M31 77H70L61 67H39ZM40 62Q30 44 50 27Q70 44 61 62Z" />
            <path d="M50 32L44 46" stroke="#284856" strokeWidth="4" />
            <path d="M24 83H77" strokeWidth="3" />
          </>
        ) : kind === "castle" ? (
          <>
            <path d="M25 78V41H31V31H39V41H46V31H54V41H61V31H69V41H76V78Z" />
            <path d="M43 78V61Q50 53 57 61V78" fill="#204454" />
          </>
        ) : kind === "puzzles" ? (
          <path d="M29 36H45Q38 22 50 22Q62 22 55 36H70V51Q84 44 84 56Q84 66 70 61V77H55Q61 62 50 63Q39 63 44 77H29V62Q16 68 16 56Q16 45 29 51Z" />
        ) : kind === "wins" ? (
          <>
            <path d="M34 28H66V50Q66 65 50 66Q34 65 34 50Z" />
            <path
              d="M34 33H23V44Q23 57 36 56M66 33H77V44Q77 57 64 56"
              fill="none"
              strokeWidth="5"
            />
            <path d="M47 66V76H37V82H63V76H53V66" />
          </>
        ) : kind === "games" || kind === "doubleAttack" ? (
          <>
            <path d="M26 27L36 30L69 70L64 76L29 38ZM73 27L64 30L31 70L37 76L71 38Z" />
            <path d="M23 70L39 85M62 85L78 70" strokeWidth="5" />
          </>
        ) : (
          <path d="M50 25L58 44L79 46L64 60L68 81L50 70L32 81L36 60L21 46L42 44Z" />
        )}
      </g>
    </svg>
  );
}
export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="drawn-stars" aria-label={`${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={i < value ? "lit" : ""}
          aria-hidden="true"
        >
          <path d="M12 2L15 8L22 9L17 14L18 22L12 18L6 22L7 14L2 9L9 8Z" />
        </svg>
      ))}
    </span>
  );
}
