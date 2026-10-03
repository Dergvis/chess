import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuth } from '../../shared/storage/authStorage';
import { loadMySupportChat, sendSupportMessage, type SupportGuest, type SupportMessage } from '../../shared/lib/supportApi';
import './SupportChat.css';

const GUEST_ID_KEY = 'chezzies_support_guest_id';
const GUEST_EMAIL_KEY = 'chezzies_support_guest_email';
const GUEST_NAME_KEY = 'chezzies_support_guest_name';
const SUPPORT_SEEN_KEY_PREFIX = 'chezzies_support_seen_admin_at';

function getGuestId(): string {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = `guest_${crypto.randomUUID()}`;
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SupportChat() {
  const auth = getAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [draft, setDraft] = useState('');
  const [guestEmail, setGuestEmail] = useState(() => localStorage.getItem(GUEST_EMAIL_KEY) || '');
  const [guestName, setGuestName] = useState(() => localStorage.getItem(GUEST_NAME_KEY) || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const guest = useMemo<SupportGuest | undefined>(() => {
    if (auth.isLoggedIn) return undefined;
    return {
      guestId: getGuestId(),
      guestEmail,
      guestName,
    };
  }, [auth.isLoggedIn, guestEmail, guestName]);

  const seenKey = useMemo(() => {
    const identity = auth.isLoggedIn
      ? auth.email || auth.userId || 'user'
      : guest?.guestId || 'guest';
    return `${SUPPORT_SEEN_KEY_PREFIX}:${identity}`;
  }, [auth.email, auth.isLoggedIn, auth.userId, guest?.guestId]);

  const markAdminMessagesSeen = (items: SupportMessage[]) => {
    const latestAdminMessage = items
      .filter((item) => item.sender === 'admin')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (latestAdminMessage) {
      localStorage.setItem(seenKey, latestAdminMessage.createdAt);
    }
    setUnreadCount(0);
  };

  const loadChat = async () => {
    if (!auth.isLoggedIn && !guest?.guestId) return;
    try {
      const data = await loadMySupportChat(guest);
      const items = Array.isArray(data.messages) ? data.messages : [];
      setMessages(items);

      if (open) {
        markAdminMessagesSeen(items);
      } else {
        const seenAt = localStorage.getItem(seenKey);
        const adminMessages = items.filter((item) => item.sender === 'admin');

        if (!seenAt) {
          setUnreadCount(adminMessages.length);
        } else {
          const seenTime = new Date(seenAt).getTime();
          setUnreadCount(adminMessages.filter((item) => new Date(item.createdAt).getTime() > seenTime).length);
        }
      }

      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load support messages");
    }
  };

  useEffect(() => {
    loadChat();

    const interval = window.setInterval(loadChat, open ? 3000 : 15000);
    const handleFocus = () => loadChat();
    const handleVisibility = () => {
      if (!document.hidden) loadChat();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [open, auth.isLoggedIn, guest?.guestId, guestEmail, guestName, seenKey]);

  useEffect(() => {
    if (open) {
      markAdminMessagesSeen(messages);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || loading) return;

    if (!auth.isLoggedIn) {
      const email = guestEmail.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Enter an email so we can reply");
        return;
      }
      localStorage.setItem(GUEST_EMAIL_KEY, email);
      localStorage.setItem(GUEST_NAME_KEY, guestName.trim());
    }

    setLoading(true);
    setError('');
    try {
      const saved = await sendSupportMessage(text, guest);
      setMessages((current) => [...current, saved]);
      setDraft('');
      setTimeout(loadChat, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="support-chat">
      {open && (
        <section className="support-panel">
          <header className="support-header">
            <div>
              <strong>CHEZZIES help</strong>
              <span>A reply will appear here</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close support">
              ×
            </button>
          </header>

          <div className="support-messages">
            {!auth.isLoggedIn && (
              <div className="support-guest-fields">
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  placeholder="Email for a reply"
                />
                <input
                  type="text"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Name (optional)"
                />
              </div>
            )}

            {messages.length === 0 && (
              <div className="support-empty">
                Describe what happened, which screen you were on and what did not work. Do not include your password.
              </div>
            )}
            {messages.map((item) => (
              <div key={item.id} className={`support-message ${item.sender}`}>
                <div className="support-bubble">{item.message}</div>
                <div className="support-time">
                  {item.sender === 'admin' ? "Support" : "You"} · {formatTime(item.createdAt)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {error && <div className="support-error">{error}</div>}

          <footer className="support-compose">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write your question..."
              rows={3}
              maxLength={2000}
            />
            <button type="button" onClick={handleSend} disabled={loading || !draft.trim()}>
              {loading ? '...' : "Send"}
            </button>
          </footer>
        </section>
      )}

      <button type="button" className="support-toggle" aria-label="Help" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Help
        {!open && unreadCount > 0 && (
          <span className="support-unread-badge" aria-label={`New messages: ${unreadCount}`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
