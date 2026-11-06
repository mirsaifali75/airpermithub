"use server";

import { createRateLimiter } from "@/lib/api/rate-limit";
import { accountsEnabled } from "@/lib/auth/config";
import { sha256 } from "@/lib/auth/crypto";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { loadSavedWork, storeSavedWork, type AccountItem, type PushItem, type PushResult } from "@/lib/storage/account";

/**
 * The browser sends changes at most every 0.8 seconds and pulls once per page,
 * so these only stop a script hammering the database. Each server instance
 * counts on its own.
 */
const pushes = createRateLimiter({ limit: 120, windowMs: 60_000 });
const pulls = createRateLimiter({ limit: 120, windowMs: 60_000 });

/**
 * Saved work for the signed-in account, called by AccountSync in the browser.
 * `owner` is an opaque id, so the browser can tell whose work it holds without
 * learning the account id.
 */
export async function pullSaved(): Promise<{ signedIn: false } | { signedIn: true; owner: string; items: AccountItem[] }> {
  if (!accountsEnabled) return { signedIn: false };
  const s = await getSession();
  if (!s) return { signedIn: false };
  // Throw rather than answer "signed out": that answer would clear this browser's copy.
  if (!pulls.check(s.user.id).allowed) throw new Error("Too many requests");
  return { signedIn: true, owner: sha256(`saved-work-owner:${s.user.id}`).slice(0, 32), items: await loadSavedWork(prisma, s.user.id) };
}

export async function pushSaved(items: PushItem[]): Promise<PushResult> {
  if (!accountsEnabled) return { error: "Accounts aren't open yet." };
  const s = await getSession();
  if (!s) return { error: "Sign in to save your work to your account." };
  if (!pushes.check(s.user.id).allowed) return { error: "Too many saves in a minute. Your changes stay in this browser and go to your account with your next change." };
  return storeSavedWork(prisma, s.user.id, items);
}
