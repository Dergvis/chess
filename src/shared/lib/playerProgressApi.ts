import type { PlayerProgress } from '../types/progress';
import { getAuth } from '../storage/authStorage';
import {
  getPlayerProgress,
  hasSavedPlayerProgress,
  replacePlayerProgress,
  resetProgress,
} from '../storage/playerProgressStorage';

interface RemoteProgressResponse {
  progress: PlayerProgress | null;
  updatedAt: string | null;
}

function gamesCount(progress: PlayerProgress | null): number {
  return progress?.stats?.totalGamesPlayed || 0;
}

function withAccount(progress: PlayerProgress, email: string): PlayerProgress {
  return email ? { ...progress, accountEmail: email } : progress;
}

function canPushLocalProgress(local: PlayerProgress, remote: PlayerProgress | null): boolean {
  if (!remote) return true;

  const localGames = gamesCount(local);
  const remoteGames = gamesCount(remote);

  if (localGames < remoteGames) return false;

  // The app syncs after each finished match. A bigger jump usually means an old cached
  // browser is trying to upload stale/corrupted progress, so keep the server copy.
  if (localGames > remoteGames + 1) return false;

  if (localGames === remoteGames) {
    const localUpdatedAt = local.updatedAt || local.createdAt || '';
    const remoteUpdatedAt = remote.updatedAt || remote.createdAt || '';
    return localUpdatedAt > remoteUpdatedAt;
  }

  return true;
}

async function loadRemoteProgress(): Promise<RemoteProgressResponse | null> {
  const response = await fetch('/api/player/progress', {
    method: 'GET',
    credentials: 'include',
  });

  if (response.status === 401) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || '?? ??????? ????????? ????????');
  }

  return {
    progress: data.progress || null,
    updatedAt: data.updatedAt || data.progress?.updatedAt || null,
  };
}

export async function pushPlayerProgressToServer(progress: PlayerProgress = getPlayerProgress()): Promise<void> {
  const auth = getAuth();
  const remote = await loadRemoteProgress();
  const progressForAccount = withAccount(progress, auth.email);

  if (remote?.progress && !canPushLocalProgress(progressForAccount, remote.progress)) {
    const remoteForAccount = withAccount(remote.progress, auth.email);
    replacePlayerProgress(remoteForAccount);
    return;
  }

  const response = await fetch('/api/player/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ progress: progressForAccount }),
  });

  if (response.status === 401) return;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || '?? ??????? ????????? ????????');
  }

  if (data.progress) {
    replacePlayerProgress(data.progress);
  }
}

export async function syncPlayerProgressFromServer(): Promise<PlayerProgress> {
  // PROGRESS_ACCOUNT_ISOLATION_V1
  const remote = await loadRemoteProgress();
  const auth = getAuth();
  const email = (auth.email || '').trim().toLowerCase();
  const rawHasLocal = hasSavedPlayerProgress();
  const local = getPlayerProgress();

  // Старый localStorage без accountEmail нельзя считать прогрессом нового аккаунта.
  // Иначе новый email видит чужого героя, XP и статистику с этого же браузера.
  const localBelongsToAccount = !email || local.accountEmail === email;
  const hasLocal = rawHasLocal && localBelongsToAccount;

  if (!remote) {
    return hasLocal ? withAccount(local, email) : local;
  }

  if (!remote.progress) {
    if (hasLocal) {
      await pushPlayerProgressToServer(withAccount(local, email));
      return getPlayerProgress();
    }

    resetProgress();
    const emptyProgress = withAccount(getPlayerProgress(), email);
    replacePlayerProgress(emptyProgress);
    return emptyProgress;
  }

  if (hasLocal && canPushLocalProgress(withAccount(local, email), remote.progress) && gamesCount(local) > gamesCount(remote.progress)) {
    await pushPlayerProgressToServer(withAccount(local, email));
    return getPlayerProgress();
  }

  const remoteForAccount = withAccount(remote.progress, email);
  replacePlayerProgress(remoteForAccount);
  return remoteForAccount;
}
