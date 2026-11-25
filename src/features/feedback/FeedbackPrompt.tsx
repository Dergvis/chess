import { useState } from 'react';
import { SPANISH } from '../../locale';
import { anonymousPlayerId, trackGameEvent } from '../../analytics';
import './feedback.css';

// Owner 25.11: after the 2nd finished game, back on the map, the player's own hero asks for impressions.
// "Not now" -> ask once more 3 games later, then never. Text only (no voice), no names or contacts.
const KEY = 'chezzies-feedback';
type State = { sent?: boolean; asked?: number; at?: number };
const read = (): State => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const write = (s: State) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };

export function feedbackDue(finishedGames: number): boolean {
  const s = read();
  if (s.sent || (s.asked || 0) >= 2) return false;
  return s.asked ? finishedGames >= (s.at || 0) + 3 : finishedGames >= 2;
}

const T = SPANISH ? {
  hi: (n: string) => `¡Hola! Soy ${n}.`,
  intro: 'Cuéntanos qué te parece Chezzies, si quieres junto con un adulto. Queremos que el juego sea lo más cómodo y divertido para ti.',
  age: '¿Cuántos años tiene quien juega?', ages: ['4–6', '7–9', '10–12', '13+', 'Soy un adulto'],
  since: '¿Desde cuándo juegas al ajedrez?', sinces: ['Acabo de empezar', 'Unos meses', 'Un año', 'Más de un año'],
  liked: '¿Qué te gusta?', disliked: '¿Qué no te gusta?', problems: '¿Algo no funcionó o fue difícil?',
  friends: '¿Qué nos falta para que tus amigos también quieran jugar?', ideas: '¿Qué te gustaría añadir?',
  note: 'Por favor, no escribas nombres, colegio ni datos de contacto.',
  send: 'Enviar', later: 'Ahora no', sending: 'Enviando…', thanks: '¡Muchas gracias!', thanksText: 'Leeremos cada respuesta. ¡Nos ayudas a mejorar Chezzies!', close: 'Seguir jugando',
  empty: 'Responde al menos una pregunta.', fail: 'No se pudo enviar. Inténtalo más tarde.',
} : {
  hi: (n: string) => `Hi! It's me, ${n}.`,
  intro: 'Tell us what you think of Chezzies — together with a grown-up if you like. We want the game to be as easy and fun for you as possible.',
  age: 'How old is the player?', ages: ['4–6', '7–9', '10–12', '13+', "I'm a grown-up"],
  since: 'How long have you played chess?', sinces: ['Just started', 'A few months', 'About a year', 'Longer'],
  liked: 'What do you like?', disliked: "What don't you like?", problems: 'Did something not work or feel hard?',
  friends: 'What is missing so your friends would want to play too?', ideas: 'What would you like us to add?',
  note: "Please don't write names, school or contact details.",
  send: 'Send', later: 'Not now', sending: 'Sending…', thanks: 'Thank you so much!', thanksText: 'We read every answer. You are helping us make Chezzies better!', close: 'Keep playing',
  empty: 'Please answer at least one question.', fail: 'Could not send. Please try again later.',
};
const AGES = ['4-6', '7-9', '10-12', '13+', 'adult'], SINCES = ['new', 'months', 'year', 'years'];
const FIELDS = ['liked', 'disliked', 'problems', 'friends', 'ideas'] as const;

export function FeedbackPrompt({ heroName, heroImage, hero, games, onClose }: { heroName: string; heroImage: string; hero: string; games: number; onClose: () => void }) {
  const [age, setAge] = useState(''), [since, setSince] = useState('');
  const [text, setText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState('');
  function later() { const s = read(); write({ ...s, asked: (s.asked || 0) + 1, at: games }); trackGameEvent('feedback_later'); onClose(); }
  async function send() {
    if (!age && !since && !FIELDS.some(f => text[f]?.trim())) { setError(T.empty); return; }
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/feedback/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...text, age, since, p: anonymousPlayerId(), lang: SPANISH ? 'es' : 'en', hero, games }) });
      if (!r.ok && r.status !== 429) throw new Error();
      write({ ...read(), sent: true }); trackGameEvent('feedback_sent'); setDone(true);
    } catch { setError(T.fail); } finally { setBusy(false); }
  }
  return <div className="world-modal feedback-modal" role="dialog" aria-modal="true" aria-labelledby="fb-title">
    <section className="feedback-card">
      <div className="feedback-head"><img src={heroImage} alt="" /><div><h2 id="fb-title">{done ? T.thanks : T.hi(heroName)}</h2><p>{done ? T.thanksText : T.intro}</p></div></div>
      {done ? <button className="world-button feedback-send" onClick={onClose}>{T.close}</button> : <>
        <fieldset><legend>{T.age}</legend><div className="feedback-chips">{AGES.map((a, i) => <button key={a} type="button" className={age === a ? 'on' : ''} aria-pressed={age === a} onClick={() => setAge(age === a ? '' : a)}>{T.ages[i]}</button>)}</div></fieldset>
        <fieldset><legend>{T.since}</legend><div className="feedback-chips">{SINCES.map((a, i) => <button key={a} type="button" className={since === a ? 'on' : ''} aria-pressed={since === a} onClick={() => setSince(since === a ? '' : a)}>{T.sinces[i]}</button>)}</div></fieldset>
        {FIELDS.map(f => <label key={f}>{T[f]}<textarea rows={2} maxLength={1000} value={text[f] || ''} onChange={e => setText({ ...text, [f]: e.target.value })} /></label>)}
        <p className="feedback-note">{T.note}</p>
        {error && <p className="feedback-error" role="alert">{error}</p>}
        <div className="feedback-actions"><button className="world-button feedback-send" disabled={busy} onClick={() => void send()}>{busy ? T.sending : T.send}</button><button type="button" className="feedback-later" onClick={later}>{T.later}</button></div>
      </>}
    </section>
  </div>;
}
