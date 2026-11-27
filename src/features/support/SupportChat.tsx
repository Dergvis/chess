import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getAuth } from '../../shared/storage/authStorage';
import { getSupportRequests, sendSupportMessage, type SupportRequest } from '../../shared/lib/supportApi';
import './SupportChat.css';

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const signedIn = getAuth().isLoggedIn;
  const timeline = requests.flatMap(request => [
    { key: `${request.ticket}-question`, ticket: request.ticket, message: request.message, createdAt: request.createdAt, fromTeam: false },
    ...request.replies.map((reply, index) => ({ key: `${request.ticket}-reply-${index}`, ticket: request.ticket, message: reply.message, createdAt: reply.createdAt, fromTeam: true })),
  ]).sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

  useLayoutEffect(() => {
    const messages = messagesRef.current;
    if (open && messages && stickToBottom.current) messages.scrollTop = messages.scrollHeight;
  }, [open, requests]);

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
      stickToBottom.current = true;
      setRequests(current => [...current, { ticket: result.ticket, message: draft.trim(), createdAt: new Date().toISOString(), replies: [] }]);
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
      <div className="support-messages" ref={messagesRef} onScroll={event => {
        const messages = event.currentTarget;
        stickToBottom.current = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 48;
      }}>
        <div className="support-empty">{signedIn ? 'Your questions and replies follow your account across devices. Your email is not sent to Telegram.' : 'As a guest, replies are available in this browser. Sign in to keep them across devices.'}</div>
        {!requests.length && <div className="support-empty">Tell us what happened and which screen you were on. Do not include passwords or personal details. The CHEZZIES team can reply here.</div>}
        {timeline.map(item => <div className={`support-message${item.fromTeam ? '' : ' user'}`} key={item.key}>
          <div className="support-time">{item.fromTeam ? 'CHEZZIES team' : 'Question'} #{item.ticket} · {new Date(item.createdAt).toLocaleString()}</div>
          <div className="support-bubble">{item.message}</div>
        </div>)}
      </div>
      {error && <div className="support-error" role="alert">{error}</div>}
      <div className="support-compose">
        <label htmlFor="support-question">Your question</label>
        <textarea id="support-question" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write your question..." rows={4} maxLength={2000} />
        <button type="button" onClick={send} disabled={loading || !draft.trim()}>{loading ? 'Sending...' : 'Send question'}</button>
      </div>
    </section>}
    <button type="button" className="support-toggle" aria-label="Help" aria-expanded={open} onClick={() => { stickToBottom.current = true; setOpen(!open); }}>Help</button>
  </div>;
}
