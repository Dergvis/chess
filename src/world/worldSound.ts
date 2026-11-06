import { soundSystem } from "../shared/lib/soundSystem";
export type WorldSound =
  | "success"
  | "upgrade"
  | "laserCharge"
  | "lightningCharge"
  | "rocketAim"
  | "laserFire"
  | "lightningFire"
  | "rocketLaunch"
  | "explosion"
  | "rocketFlight"
  | "multiHit"
  | "newRecord"
  | "castleDamage";
const tones: Record<WorldSound, [number, number, number, OscillatorType]> = {
  success: [520, 850, 0.25, "sine"],
  upgrade: [330, 1200, 0.65, "sine"],
  laserCharge: [180, 1100, 0.5, "sine"],
  lightningCharge: [120, 900, 0.5, "triangle"],
  rocketAim: [160, 260, 0.3, "sine"],
  laserFire: [1200, 180, 0.5, "sawtooth"],
  lightningFire: [900, 120, 0.5, "sawtooth"],
  rocketLaunch: [110, 430, 0.4, "triangle"],
  explosion: [120, 30, 0.5, "triangle"],
  rocketFlight: [260, 110, 0.23, "sine"],
  multiHit: [620, 980, 0.27, "sine"],
  newRecord: [420, 1250, 0.65, "sine"],
  castleDamage: [75, 25, 0.3, "triangle"],
};
let context: AudioContext | undefined;
export function playWorldSound(effect: WorldSound) {
  if (!soundSystem.isEnabled()) return;
  try {
    context ||= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const [from, to, duration, type] = tones[effect],
      osc = context.createOscillator(),
      gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      to,
      context.currentTime + duration
    );
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration
    );
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + duration);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch {}
}
