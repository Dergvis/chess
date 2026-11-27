import { useId } from "react";
import type { HeroId } from "./types";
import { partNames } from "./growth";
export const partPositions: Record<HeroId, number[][]> = {
  inventor: [
    [77, 28.5, 10],
    [61, 50, 13],
    [69, 32, 12],
    [56, 56, 20],
  ],
  mage: [
    [34, 23, 10],
    [34.5, 11.7, 10],
    [36, 18, 13],
    [34.5, 8, 19],
  ],
  knight: [
    [54, 16, 13],
    [60, 53, 10],
    [75, 19, 17],
    [27, 34, 16],
  ],
};
export default function Equipment({
  hero,
  index,
}: {
  hero: HeroId;
  index: number;
}) {
  const uid = useId().replace(/:/g, ""),
    gold = uid + "gold",
    gem = uid + "gem";
  const cool = hero === "mage";
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={partNames[hero][index]}
      className="equipment-art"
    >
      <defs>
        <linearGradient id={gold} x2=".8" y2="1">
          <stop stopColor="#fff4c7" />
          <stop offset=".3" stopColor="#edc16a" />
          <stop offset=".6" stopColor="#98601b" />
          <stop offset="1" stopColor="#f8da87" />
        </linearGradient>
        <radialGradient id={gem}>
          <stop stopColor="#fff" />
          <stop offset=".3" stopColor={cool ? "#c4fbff" : "#fff0aa"} />
          <stop offset=".7" stopColor={cool ? "#2cbded" : "#ffae24"} />
          <stop offset="1" stopColor={cool ? "#184c8f" : "#a84909"} />
        </radialGradient>
      </defs>
      <g stroke="#714817" strokeWidth="3" fill={`url(#${gold})`}>
        {hero === "inventor" ? (
          index === 0 ? (
            <>
              <circle cx="50" cy="50" r="38" />
              <circle cx="50" cy="50" r="27" fill={`url(#${gem})`} />
              <path
                d="M28 32L38 24M65 75L75 65"
                stroke="#fff2cb"
                strokeWidth="6"
              />
            </>
          ) : index === 1 ? (
            <>
              <path d="M50 6L85 27V73L50 94L15 73V27Z" />
              <path d="M50 20L70 36V64L50 80L30 64V36Z" fill={`url(#${gem})`} />
            </>
          ) : index === 2 ? (
            <>
              <path d="M9 30L75 20L92 35V65L75 80L9 70Z" />
              <path
                d="M25 28V72M43 25V75M62 22V78"
                stroke="#fff0b6"
                strokeWidth="7"
              />
              <ellipse cx="80" cy="50" rx="10" ry="23" fill={`url(#${gem})`} />
            </>
          ) : (
            <>
              <path d="M12 15Q50 0 88 15L80 64L50 94L20 64Z" />
              <path d="M25 27L75 27L67 59L50 77L33 59Z" fill="#f1e8ce" />
              <path d="M50 34L59 47L52 61L40 49Z" fill={`url(#${gem})`} />
            </>
          )
        ) : hero === "mage" ? (
          index === 0 ? (
            <>
              <rect x="33" y="6" width="34" height="88" rx="10" />
              <path
                d="M33 23L67 33M33 43L67 53M33 63L67 73"
                stroke="#85deff"
                strokeWidth="7"
              />
            </>
          ) : index === 1 ? (
            <>
              <path d="M50 4L79 35L65 84L50 96L35 84L21 35Z" />
              <path d="M50 12L68 36L50 87L32 36Z" fill={`url(#${gem})`} />
            </>
          ) : index === 2 ? (
            <>
              <ellipse cx="50" cy="50" rx="43" ry="23" />
              <ellipse cx="50" cy="47" rx="28" ry="11" fill="#8bd9ed" />
              <path d="M18 30L9 14L35 35M68 30L91 14L80 38" />
            </>
          ) : (
            <>
              <path d="M10 29L29 47L50 7L71 47L90 29L79 78H21Z" />
              <circle cx="50" cy="59" r="14" fill={`url(#${gem})`} />
            </>
          )
        ) : index === 0 ? (
          <>
            <path d="M20 60L31 90H66L78 60Z" />
            <rect x="10" y="18" width="80" height="43" rx="12" />
            <circle cx="77" cy="40" r="16" fill={`url(#${gem})`} />
            <path d="M77 24V56M61 40H93" stroke="#fff5c6" strokeWidth="2" />
          </>
        ) : index === 1 ? (
          <>
            <path d="M32 89V34L50 6L68 34V89Z" />
            <path d="M35 38H65V74H35Z" fill={`url(#${gem})`} />
          </>
        ) : index === 2 ? (
          <>
            <path d="M8 25L87 12V88L8 74Z" fill="#29363b" />
            <path
              d="M25 22V77M66 16V84"
              stroke={`url(#${gold})`}
              strokeWidth="14"
            />
          </>
        ) : (
          <>
            <path d="M40 8H60V92H40Z" />
            <path d="M40 28L8 8V62L40 72M60 28L92 8V62L60 72Z" />
          </>
        )}
      </g>
    </svg>
  );
}
