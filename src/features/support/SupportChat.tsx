import { useEffect, useState } from 'react';
import { getAuth } from '../../shared/storage/authStorage';
import { getSupportRequests, sendSupportMessage, type SupportRequest } from '../../shared/lib/supportApi';
import './SupportChat.css';

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signedIn = getAuth().isLoggedIn;

  useEffect(() => {
    if (!open) return;
    let active = true;
    const refresh = async () => {
      try { const next = await getSupportRequests(); if (active) setRequests(next); }
      catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Could not load your questions.'); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [open]);

  const send = async () => {
    if (!draft.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await sendSupportMessage(draft.trim());
      setRequests(current => [{ ticket: result.ticket, message: draft.trim(), createdAt: new Date().toISOString(), replies: [] }, ...current]);
      setDraft('');
      void getSupportRequests().then(setRequests).catch(() => {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send your question.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="support-chat">
    {open && <section className="support-panel" aria-label="CHEZZIES help">
      <header className="support-header">
        <div><strong>CHEZZIES help</strong><span>Send a question to the game team</span></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close help">×</button>
      </header>
      <div className="support-messages">
        {!requests.length && <div className="support-empty">Tell us what happened and which screen you were on. Do not include passwords or personal details. The CHEZZIES team can reply here.</div>}
        {requests.map(request => <div className="support-thread" key={request.ticket}>
          <div className="support-time">Question #{request.ticket}</div>
          <div className="support-message user"><div className="support-bubble">{request.message}</div></div>
          {request.replies.map((reply, index) => <div className="support-message" key={`${request.ticket}-${index}`}><div className="support-bubble">{reply.message}</div><div className="support-time">CHEZZIES team · {new Date(reply.createdAt).toLocaleString()}</div></div>)}
        </div>)}
        <div className="support-empty">{signedIn ? 'Your questions and replies follow your account across devices. Your email is not sent to Telegram.' : 'As a guest, replies are available in this browser. Sign in to keep them across devices.'}</div>
      </div>
      {error && <div className="support-error" role="alert">{error}</div>}
      <div className="support-compose">
        <label htmlFor="support-question">Your question</label>
        <textarea id="support-question" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write your question..." rows={4} maxLength={2000} />
        <button type="button" onClick={send} disabled={loading || !draft.trim()}>{loading ? 'Sending...' : 'Send question'}</button>
      </div>
    </section>}
    <button type="button" className="support-toggle" aria-label="Help" aria-expanded={open} onClick={() => setOpen(!open)}>Help</button>
  </div>;
}
