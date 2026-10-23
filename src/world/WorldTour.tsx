import { useLayoutEffect, useState } from "react";
const steps = [
  [
    ".map-actor-position",
    "This is the world of CHEZZIES. Fortresses filled with chess challenges await.",
  ],
  [
    ".marker-mate, .marker-fork",
    "Explore a new tactic, solve puzzles and weaken each fortress’s defenses.",
  ],
  [
    ".marker-mate",
    "Solve puzzles to help your hero break through the fortress gates.",
  ],
  [".marker-arena", "Play a full chess game against the computer here."],
  [".marker-polygon", "Try a quick practice session here."],
  [
    ".recommended-location",
    "Start with the first fortress and help your hero break through its defenses!",
  ],
];
export default function WorldTour({
  onClose,
  onGo,
}: {
  onClose: () => void;
  onGo: () => void;
}) {
  const [step, setStep] = useState(0),
    [rect, setRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
  useLayoutEffect(() => {
    const update = () => {
      const rs = Array.from(document.querySelectorAll(steps[step][0])).map(
        (e) => e.getBoundingClientRect()
      );
      if (rs.length) {
        const l = Math.min(...rs.map((r) => r.left)),
          t = Math.min(...rs.map((r) => r.top));
        setRect({
          left: l - 10,
          top: t - 10,
          width: Math.max(...rs.map((r) => r.right)) - l + 20,
          height: Math.max(...rs.map((r) => r.bottom)) - t + 20,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [step]);
  return (
    <div
      className="world-tour"
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
    >
      <div className="tour-spotlight" style={rect} />
      <section className="tour-dialog">
        <small>Explore the world · {step + 1} / 6</small>
        <p>{steps[step][1]}</p>
        {step === 2 && (
          <div
            className="tour-example"
            aria-label="Puzzle, solution, shot, damage to the gates"
          >
            <span>♟ Puzzle</span>
            <span>✓ Solution</span>
            <span>✦ Shot</span>
            <span>♜ Gate damage</span>
          </div>
        )}
        <button
          autoFocus
          className="world-button"
          onClick={() => (step === 5 ? onGo() : setStep(step + 1))}
        >
          {step === 5 ? "Let’s go!" : "Next →"}
        </button>
        <button className="lesson-back" onClick={onClose}>
          Skip
        </button>
      </section>
    </div>
  );
}
