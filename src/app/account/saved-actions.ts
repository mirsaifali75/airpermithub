"use server";

import { accountsEnabled } from "@/lib/auth/config";
import { sha256 } from "@/lib/auth/crypto";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { loadSavedWork, storeSavedWork, type AccountItem, type PushItem, type PushResult } from "@/lib/storage/account";

/**
 * Saved work for the signed-in account, called by AccountSync in the browser.
 * `owner` is an opaque id, so the browser can tell whose work it holds without
 * learning the account id.
 */
export async function pullSaved(): Promise<{ signedIn: false } | { signedIn: true; owner: string; items: AccountItem[] }> {
  if (!accountsEnabled) return { signedIn: false };
  const s = await getSession();
  if (!s) return { signedIn: false };
  return { signedIn: true, owner: sha256(`saved-work-owner:${s.user.id}`).slice(0, 32), items: await loadSavedWork(prisma, s.user.id) };
}

export async function pushSaved(items: PushItem[]): Promise<PushResult> {
  if (!accountsEnabled) return { error: "Accounts aren't open yet." };
  const s = await getSession();
  if (!s) return { error: "Sign in to save your work to your account." };
  return storeSavedWork(prisma, s.user.id, items);
}
