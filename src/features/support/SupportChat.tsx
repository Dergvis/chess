import { useState } from 'react';
import { getAuth } from '../../shared/storage/authStorage';
import { sendSupportMessage } from '../../shared/lib/supportApi';
import './SupportChat.css';

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [ticket, setTicket] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signedIn = getAuth().isLoggedIn;

  const send = async () => {
    if (!draft.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await sendSupportMessage(draft.trim());
      setTicket(result.ticket);
      setDraft('');
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
        {ticket ? <div className="support-empty" role="status">Question #{ticket} was sent. Thank you.</div> : <div className="support-empty">Tell us what happened and which screen you were on. Do not include passwords or personal details. Your question goes to the CHEZZIES team in a private Telegram group. Replies in the game are not available yet.</div>}
        {signedIn && <div className="support-empty">Your account is linked to the question number, but your email is not sent to Telegram.</div>}
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
