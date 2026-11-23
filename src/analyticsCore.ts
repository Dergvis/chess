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
