export interface SupportGuest {
  guestId: string;
  guestEmail?: string;
  guestName?: string;
}

export interface SupportMessage {
  id: string;
  threadId: string;
  sender: 'user' | 'admin';
  message: string;
  createdAt: string;
}

function guestQuery(guest?: SupportGuest): string {
  if (!guest?.guestId) return '';
  const params = new URLSearchParams({
    guestId: guest.guestId,
    guestEmail: guest.guestEmail || '',
    guestName: guest.guestName || '',
  });
  return `?${params.toString()}`;
}

export async function loadMySupportChat(guest?: SupportGuest): Promise<{ threadId: string; messages: SupportMessage[] }> {
  const response = await fetch(`/api/support/my${guestQuery(guest)}`, {
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Could not load support messages");
  }
  return data;
}

export async function sendSupportMessage(message: string, guest?: SupportGuest): Promise<SupportMessage> {
  const response = await fetch('/api/support/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      message,
      guestId: guest?.guestId,
      guestEmail: guest?.guestEmail,
      guestName: guest?.guestName,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Could not send the message");
  }
  return data.message;
}
