"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { pullSaved, pushSaved } from "@/app/account/saved-actions";
import {
  baseVersions, browserOwner, clearSavedHere, dirtyKeys, markDirty, rawStored, readStored, removeStored, savedKeysHere,
  setAccountQueue, setBaseVersions, setBrowserOwner, settled, writeStored,
} from "@/lib/storage/browser";
import { mergeSaved, SAVED_LIMITS } from "@/lib/storage/saved";

/**
 * Keeps work saved in the tools in step with the signed-in account:
 * - On the first sign-in in a browser, work saved here while signed out joins the account's.
 * - After that, the account's copy loads on each visit, and every change is sent within a second.
 * - A change made without having seen the account's latest copy gives way to it (see storeSavedWork).
 * - After signing out, the account's work is removed from this browser.
 * Mounted once in the root layout, and only while accounts are open.
 */

const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;

/** Applies the account's copy of a key to this browser. */
function takeAccount(key: string, value: unknown, version: string | null) {
  if (value === null || value === undefined) removeStored(key);
  else writeStored(key, value, { fromAccount: true });
  setBaseVersions({ [key]: version });
}

async function send(keys: string[]) {
  const base = baseVersions();
  const sent = new Map<string, string | undefined>();
  for (const k of keys) sent.set(k, rawStored(k) ?? "null");
  const items = [...sent].map(([key, raw]) => ({ key, value: JSON.parse(raw ?? "null") as unknown, base: base[key] ?? null }));
  for (let i = 0; i < items.length; i += SAVED_LIMITS.itemsPerPush) {
    const batch = items.slice(i, i + SAVED_LIMITS.itemsPerPush);
    const r = await pushSaved(batch).catch(() => null);
    if (!r || "error" in r) {
      // Left noted as changed, so the next visit sends them again.
      if (r) console.warn("Saved work wasn't stored in your account:", r.error);
      for (const it of batch) sent.delete(it.key);
      continue;
    }
    setBaseVersions(Object.fromEntries(r.saved.map((s) => [s.key, s.version])));
    for (const c of r.conflicts) {
      takeAccount(c.key, c.value, c.version);
      sent.set(c.key, undefined);
    }
  }
  settled(sent);
}

function flush() {
  clearTimeout(timer);
  if (!pending.size) return;
  const keys = [...pending];
  pending.clear();
  void send(keys);
}

function queue(key: string) {
  pending.add(key);
  clearTimeout(timer);
  timer = setTimeout(flush, 800);
}

async function sync() {
  const r = await pullSaved().catch(() => null);
  if (!r) return;
  if (!r.signedIn) {
    setAccountQueue(null);
    if (browserOwner()) clearSavedHere();
    return;
  }
  const owner = browserOwner();
  if (owner && owner !== r.owner) clearSavedHere();
  const account = new Map(r.items.map((i) => [i.key, i]));
  const toSend: string[] = [];

  if (owner !== r.owner) {
    // Work saved in this browser while signed out joins the account, once.
    for (const key of savedKeysHere()) {
      const held = account.get(key);
      const merged = mergeSaved(readStored(key, null), held?.value);
      writeStored(key, merged, { fromAccount: true });
      if (JSON.stringify(merged) !== JSON.stringify(held?.value ?? null)) {
        markDirty(key);
        toSend.push(key);
      }
    }
    for (const [key, item] of account) if (rawStored(key) === null) writeStored(key, item.value, { fromAccount: true });
    setBaseVersions(Object.fromEntries(r.items.map((i) => [i.key, i.version])));
    settled(new Map([...account.keys()].filter((k) => !toSend.includes(k)).map((k) => [k, undefined])));
  } else {
    // A change made here wins only if it was made on top of the account's current copy.
    const dirty = dirtyKeys();
    const base = baseVersions();
    const takeOver = new Map<string, string | undefined>();
    for (const [key, item] of account) {
      if (dirty.has(key) && base[key] === item.version) continue;
      takeAccount(key, item.value, item.version);
      takeOver.set(key, undefined);
    }
    settled(takeOver);
    toSend.push(...[...dirtyKeys()].filter((k) => rawStored(k) !== null));
  }
  setBrowserOwner(r.owner);
  setAccountQueue(queue);
  if (toSend.length) await send(toSend);
}

export function AccountSync() {
  const pathname = usePathname();
  const last = useRef(0);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    // Sign-in, sign-out, and account pages change who is signed in, so sync right after them.
    const afterAuth = prev.current !== null && /^\/(sign-in|sign-up|verify-email|reset-password|account)/.test(prev.current);
    prev.current = pathname;
    if (last.current && !afterAuth && Date.now() - last.current < 60_000) return;
    last.current = Date.now();
    void sync();
  }, [pathname]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else if (Date.now() - last.current > 60_000) {
        last.current = Date.now();
        void sync();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}
