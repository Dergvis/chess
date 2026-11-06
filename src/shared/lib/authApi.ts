import { saveAuth, logout as clearLocalAuth } from '../storage/authStorage';

export interface AuthUser {
  id: string;
  email: string;
  childName: string;
  provider: 'email' | 'google';
}

async function authRequest(path: string, body?: Record<string, unknown>): Promise<AuthUser | null> {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (response.status===401 && path==='/api/auth/me') return null;
  if (!response.ok) {
    throw new Error(data.error || "Authentication error");
  }

  return data.user || null;
}

export async function registerUser(email: string, password: string, childName: string): Promise<AuthUser> {
  const user = await authRequest('/api/auth/register', { email, password, childName });
  if (!user) throw new Error("Could not create the account");
  saveAuth({
    isLoggedIn: true,
    userId: user.id,
    email: user.email,
    childName: user.childName,
    provider: user.provider,
  });
  return user;
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const user = await authRequest('/api/auth/login', { email, password });
  if (!user) throw new Error("Could not sign in");
  saveAuth({
    isLoggedIn: true,
    userId: user.id,
    email: user.email,
    childName: user.childName,
    provider: user.provider,
  });
  return user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch('/api/auth/request-password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Could not send the email");
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Could not update the password");
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const user = await authRequest('/api/auth/me');
  if (user) {
    saveAuth({
      isLoggedIn: true,
      userId: user.id,
      email: user.email,
      childName: user.childName,
      provider: user.provider,
    });
  }
  return user;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    clearLocalAuth();
  }
}
