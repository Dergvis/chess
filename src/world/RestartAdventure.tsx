import { useState } from "react";
import type { WorldSave } from "./types";
import { newWorld } from "./progress";
import { restartLocalWorld } from "./storage";

export default function RestartAdventure({ save }: { save: WorldSave }) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!import.meta.env.DEV) return null;
  async function restart() {
    setBusy(true);
    setError("");
    try {
      const backup = await restartLocalWorld(save, newWorld());
      const url = URL.createObjectURL(
        new Blob([backup], { type: "application/json" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "chezzies-progress-backup-" + Date.now() + ".json";
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        window.location.assign("/");
      }, 500);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not start again. Try later."
      );
      setBusy(false);
    }
  }
  return (
    <section className="restart-adventure">
      {!confirm ? (
        <button className="lesson-back" onClick={() => setConfirm(true)}>
          Start again
        </button>
      ) : (
        <>
          <h2>Start the whole adventure again?</h2>
          <p>
            This resets every hero, power-up, achievement, challenge and training ground record for this account. You will begin with the opening video and hero choice.
          </p>
          <p>
            Your login remains. A copy of your progress will be saved and downloaded before the reset.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="restart-actions">
            <button
              className="lesson-secondary"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
            <button className="world-button" disabled={busy} onClick={restart}>
              {busy ? "Saving a copy…" : "Save a copy and start again"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
