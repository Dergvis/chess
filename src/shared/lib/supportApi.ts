export async function sendSupportMessage(message: string): Promise<{ ticket: string }> {
  const response = await fetch('/api/support/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ message }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not send your question.');
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
