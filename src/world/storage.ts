import { mergeProgress } from "./mergeProgress";
import type { WorldSave } from "./types";
import { syncGrowth } from "./growth";
import { worldKey, worldAccount } from "./accountStorage";
const PROFILE = "gosha-world-profile";
let pending: { save: WorldSave; account: string; url: string } | undefined,
  sending = false,
  retry: ReturnType<typeof setTimeout> | undefined;
let resetting = false;
function profile() {
  let id = localStorage.getItem(PROFILE);
  if (!id || !/^[a-zA-Z0-9-]{20,80}$/.test(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(PROFILE, id);
  }
  return id;
}
function status(ok: boolean) {
  window.dispatchEvent(new CustomEvent("world-save-status", { detail: ok }));
}
export function queueSave(s: WorldSave) {
  if (typeof window === "undefined" || resetting || !worldAccount() || localStorage.getItem(worldKey("chezzies-pending-guest"))) return;
  pending = {
    save: JSON.parse(JSON.stringify(s)),
    account: worldAccount(),
    url: endpoint(),
  };
  void flush();
}
async function flush() {
  if (sending || !pending) return;
  sending = true;
  clearTimeout(retry);
  retry = undefined;
  const snapshot = pending;
  pending = undefined;
  if (snapshot.account !== worldAccount()) {
    sending = false;
    return;
  }
  let failed = false;
  try {
    const res = await fetch(snapshot.url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot.save),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw Error("save");
    status(true);
  } catch {
    failed = true;
    if (snapshot.account === worldAccount()) pending ||= snapshot;
    status(false);
  } finally {
    sending = false;
    if (pending)
      retry = setTimeout(
        () => {
          retry = undefined;
          void flush();
        },
        failed ? 2500 : 0
      );
  }
}
export async function restoreWorld(local: WorldSave): Promise<WorldSave> {
  if (!worldAccount()) return local;
  const account = worldAccount(),
    key = worldKey("gosha-world-v1");
  const importKey = worldKey("chezzies-pending-guest");
  const guestText = localStorage.getItem(importKey);
  const importSave = (base: WorldSave) => {
    if (!guestText) return base;
    const merged = mergeProgress(base, JSON.parse(guestText));
    localStorage.setItem(key, JSON.stringify(merged));
    localStorage.removeItem(importKey);
    return merged;
  };
  try {
    const res = await fetch(endpoint(), {
      signal: AbortSignal.timeout(4000),
    });
    if (account !== worldAccount()) return local;
    if (res.status === 404) {
      const merged=importSave(local);
      queueSave(merged);
      return merged;
    }
    if (!res.ok) throw Error("load");
    const remote = await res.json();
    if (account !== worldAccount()) return local;
    if (
      remote.version !== 1 ||
      !Array.isArray(remote.worldProgress?.completedChallenges) ||
      !remote.player ||
      !Array.isArray(remote.games)
    )
      throw Error("invalid");
    if (guestText) {const merged=importSave(mergeProgress(remote,local));queueSave(merged);return merged;}
    if ((remote.updatedAt || 0) > (local.updatedAt || 0)) {
      const restored = syncGrowth(remote);
      localStorage.setItem(key, JSON.stringify(restored));
      status(true);
      return restored;
    }
    queueSave(local);
    return local;
  } catch {
    if (account !== worldAccount()) return local;
    status(false);
    if(guestText) return local;
    queueSave(local);
    return local;
  }
}
function endpoint() {
  return worldAccount()
    ? "/api/world/account"
    : "/api/world/progress/" + profile();
}

/** Local development only. Keep the old adventure before replacing both copies. */
export async function restartLocalWorld(current: WorldSave, fresh: WorldSave) {
  if (!import.meta.env.DEV || resetting)
    throw Error("Reset is unavailable now.");
  const health = await fetch("/api/world/health", {
    signal: AbortSignal.timeout(5000),
  }).then((r) => r.json());
  if (health.mode !== "local" || health.production !== false)
    throw Error("Reset is available only in the local version.");
  const account = worldAccount(),
    url = endpoint(),
    key = worldKey("gosha-world-v1");
  resetting = true;
  clearTimeout(retry);
  pending = undefined;
  try {
    while (sending) await new Promise((resolve) => setTimeout(resolve, 50));
    clearTimeout(retry);
    pending = undefined;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok && response.status !== 404)
      throw Error("Could not check the saved progress. Try later.");
    const remote = response.ok ? await response.json() : null;
    if (account !== worldAccount())
      throw Error("The account changed. Open the game again.");
    const at = Math.max(
      Date.now(),
      (remote?.updatedAt || 0) + 1,
      (current.updatedAt || 0) + 1
    );
    const backup = {
      format: "chezzies-world-backup-v1",
      createdAt: at,
      world: current,
      serverWorld: remote,
      activeGame: localStorage.getItem(worldKey("gosha-world-active-v1")),
    };
    const serialized = JSON.stringify(backup, null, 2);
    localStorage.setItem(worldKey("gosha-world-backup-" + at), serialized);
    fresh.updatedAt = at;
    fresh.restartedAt = at;
    const saved = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fresh),
      signal: AbortSignal.timeout(5000),
    });
    if (!saved.ok)
      throw Error(
        "Could not start again. A copy of your previous progress is saved."
      );
    if (account !== worldAccount())
      throw Error("The account changed. Open the game again.");
    localStorage.removeItem(worldKey("gosha-world-active-v1"));
    localStorage.setItem(key, JSON.stringify(fresh));
    return serialized;
  } finally {
    resetting = false;
  }
}
