// Pure helpers for anonymous first-party statistics. No DOM globals, so they can be unit-tested.
export type Params = Record<string, string | number | boolean>;
const KEY = /^[A-Za-z][A-Za-z0-9_]{0,29}$/, VALUE = /^[A-Za-z0-9_-]{1,40}$/;
/** Keeps only short codes, finite numbers and booleans. Free text, objects and arrays are dropped. */
export function sanitizeParams(input: unknown, max = 12): Params | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const out: Params = {};
  let n = 0;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (n >= max || !KEY.test(k)) continue;
    if (typeof v === 'string' && VALUE.test(v)) out[k] = v;
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.round(v * 1000) / 1000;
    else if (typeof v === 'boolean') out[k] = v;
    else continue;
    n++;
  }
  return n ? out : undefined;
}
/** Event names that must never be collected (the international version has no payments). */
export const blockedEvent = (name: string) => /premium|payment|paywall|subscri|billing/.test(name);
/** Collapse whitespace and cut to 40 characters; drop labels that look personal (e-mail, long numbers). */
export function cleanLabel(text: string | null | undefined): string {
  const s = String(text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
  if (!s || /@|\d{5,}/.test(s)) return '';
  return s;
}
type LabelSource = {
  getAttribute(name: string): string | null;
  textContent: string | null;
  querySelector?(selector: string): { getAttribute(name: string): string | null } | null;
};
/** Stable label for a clicked control: data-track, then aria-label/title, then visible text, then an inner image alt. */
export function clickLabel(el: LabelSource): string {
  const track = el.getAttribute('data-track');
  if (track && cleanLabel(track)) return cleanLabel(track);
  for (const attr of ['aria-label', 'title']) { const v = cleanLabel(el.getAttribute(attr)); if (v) return v; }
  const text = cleanLabel(el.textContent);
  if (text) return text;
  const img = el.querySelector?.('img[alt],svg[aria-label]');
  return cleanLabel(img?.getAttribute('alt') || img?.getAttribute('aria-label'));
}
/** Board trail events (sent as `game:<name>`). */
export type TrailEvent = 'move_made' | 'move_rejected' | 'illegal_tap' | 'drag_attempt' | 'drag_hint_shown';
export interface BoardTrail {
  /** A legal move by the player. Resets the drag counter. */
  move(p: Record<string, unknown>): void;
  /** A tap that did nothing: `illegal_tap` (empty/opponent square, not your turn) or `move_rejected` (illegal target). */
  reject(name: 'illegal_tap' | 'move_rejected', p: Record<string, unknown>): void;
  /** The player tried to drag a piece. Returns true exactly once per board: when the one-time hint should appear. */
  drag(p: Record<string, unknown>): boolean;
}
/**
 * Per-board (one game, puzzle or task) event budget so one game cannot flood the statistics:
 * at most `max` events, drag_attempt at most once per 3 s, the same rejected tap at most once per second.
 * After 3 drag attempts with no successful move in between, `drag()` asks for the hint once.
 */
export function createBoardTrail(mode: string, sink: (name: TrailEvent, params: Params) => void, now: () => number = () => Date.now(), max = 200): BoardTrail {
  let sent = 0, drags = 0, hinted = false, lastDrag = -Infinity, lastTap = '', lastTapAt = -Infinity;
  const emit = (name: TrailEvent, p: Record<string, unknown>) => {
    if (sent >= max) return;
    sent++;
    sink(name, sanitizeParams({ ...p, mode }) || {});
  };
  return {
    move(p) { drags = 0; emit('move_made', p); },
    reject(name, p) {
      const key = name + ':' + String(p.from ?? '') + String(p.square ?? p.to ?? ''), t = now();
      if (key === lastTap && t - lastTapAt < 1000) return;
      lastTap = key; lastTapAt = t;
      emit(name, p);
    },
    drag(p) {
      drags++;
      const t = now();
      if (t - lastDrag >= 3000) { lastDrag = t; emit('drag_attempt', { ...p, n: drags }); }
      if (hinted || drags < 3) return false;
      hinted = true;
      emit('drag_hint_shown', {});
      return true;
    },
  };
}
