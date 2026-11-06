import { isSavedKey } from "./saved";

/**
 * The browser side of saved work: localStorage, plus a note of which keys
 * changed since they last reached the account. Every read and write is
 * guarded, because storage can be full, blocked, or missing (private windows).
 */

const OWNER = "aph.sync.owner";
const DIRTY = "aph.sync.dirty";
const BASE = "aph.sync.base";
export const STORED_EVENT = "aph:stored";

const get = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const set = (key: string, raw: string) => { try { localStorage.setItem(key, raw); return true; } catch { return false; } };
const del = (key: string) => { try { localStorage.removeItem(key); } catch {} };

export function readStored<T>(key: string, fallback: T): T {
  const raw = get(key);
  if (raw === null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export const rawStored = get;

let queue: ((key: string) => void) | null = null;
/** Set while signed in: called with each saved key the person changes, to send it to the account. */
export const setAccountQueue = (fn: ((key: string) => void) | null) => { queue = fn; };

/**
 * Stores `value` under `key`. A change the person made is noted for the
 * account; a value that came from the account tells open tools to reload it.
 */
export function writeStored(key: string, value: unknown, { fromAccount = false } = {}) {
  const raw = JSON.stringify(value);
  if (raw === undefined || get(key) === raw || !set(key, raw)) return;
  if (fromAccount) {
    window.dispatchEvent(new CustomEvent(STORED_EVENT, { detail: key }));
  } else if (isSavedKey(key)) {
    markDirty(key);
    queue?.(key);
  }
}

/** Removes a key that the account no longer holds, and tells open tools. */
export function removeStored(key: string) {
  if (get(key) === null) return;
  del(key);
  window.dispatchEvent(new CustomEvent(STORED_EVENT, { detail: key }));
}

/** Calls `fn` with the key whenever saved work arrives from the account or is cleared. */
export function onStored(fn: (key: string) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<string>).detail);
  window.addEventListener(STORED_EVENT, handler);
  return () => window.removeEventListener(STORED_EVENT, handler);
}

export const dirtyKeys = () => new Set(readStored<string[]>(DIRTY, []));
export function markDirty(key: string) {
  const d = dirtyKeys();
  if (!d.has(key)) set(DIRTY, JSON.stringify([...d, key]));
}
/** Clears the change note for keys that hold `raw` (what was sent), or for any listed key when `raw` is omitted. */
export function settled(done: Map<string, string | undefined>) {
  const left = [...dirtyKeys()].filter((k) => !done.has(k) || (done.get(k) !== undefined && get(k) !== done.get(k)));
  if (left.length) set(DIRTY, JSON.stringify(left));
  else del(DIRTY);
}

/**
 * The account's version of each key as this browser last saw it. A change is
 * stored only if the account still has that version, so a browser that never
 * saw the account's copy (a tool opened before its work loaded) can't
 * overwrite it.
 */
export const baseVersions = () => readStored<Record<string, string>>(BASE, {});
export function setBaseVersions(update: Record<string, string | null>) {
  const b = baseVersions();
  for (const [k, v] of Object.entries(update)) {
    if (v === null) delete b[k];
    else b[k] = v;
  }
  set(BASE, JSON.stringify(b));
}

/** Whose saved work this browser holds: an opaque id from the server, or null for work saved while signed out. */
export const browserOwner = () => get(OWNER);
export const setBrowserOwner = (owner: string) => set(OWNER, owner);

export function savedKeysHere() {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && isSavedKey(k)) keys.push(k);
    }
  } catch {}
  return keys;
}

/** Removes an account's work from this browser after it signs out, so the next person here doesn't see it. */
export function clearSavedHere() {
  const keys = savedKeysHere();
  for (const k of keys) del(k);
  del(OWNER);
  del(DIRTY);
  del(BASE);
  for (const k of keys) window.dispatchEvent(new CustomEvent(STORED_EVENT, { detail: k }));
}
