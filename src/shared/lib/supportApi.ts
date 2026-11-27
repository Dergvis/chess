import { anonymousPlayerId, trackGameEvent } from '../../analytics';
import { boardSnapshot } from './boardSnapshot';
export async function sendSupportMessage(message: string): Promise<{ ticket: string }> {
  const response = await fetch('/api/support/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    // The anonymous device id links the question to this player's trail in the admin page (no name or e-mail).
    // The board in play (position, mode, last refused moves) replaces a screenshot.
    body: JSON.stringify({ message, p: anonymousPlayerId(), board: boardSnapshot() }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not send your question.');
  trackGameEvent('help_sent');
  return data;
}

export interface SupportRequest {
  ticket: string;
  message: string;
  createdAt: string;
  replies: { message: string; createdAt: string }[];
}

export async function getSupportRequests(): Promise<SupportRequest[]> {
  const response = await fetch('/api/support/my', { credentials: 'include', cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load your questions.');
  return Array.isArray(data.requests) ? data.requests : [];
}
