import { useState } from "react";
import { soundSystem } from "../shared/lib/soundSystem";
import { getSettings, updateSetting } from "../shared/storage/settingsStorage";
export function syncWorldSound() {
  soundSystem.setEnabled(getSettings().soundEnabled);
}
export default function SoundToggle() {
  const [enabled, setEnabled] = useState(() => {
    syncWorldSound();
    return getSettings().soundEnabled;
  });
  return (
    <button
      className="sound-toggle"
      title="Move and victory sounds"
      aria-label={enabled ? "Mute sound" : "Enable sound"}
      aria-pressed={enabled}
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        updateSetting("soundEnabled", next);
        syncWorldSound();
        if (next) soundSystem.play("buttonClick");
        window.dispatchEvent(new Event("chezzies-sound-change"));
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M3 9H7L12 5V19L7 15H3Z" />
        {enabled ? (
          <>
            <path d="M15 8Q19 12 15 16M18 5Q25 12 18 19" />
          </>
        ) : (
          <path d="M16 9L22 15M22 9L16 15" />
        )}
      </svg>
      <span>Sound</span>
    </button>
  );
}
