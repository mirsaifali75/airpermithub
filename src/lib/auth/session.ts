import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { accountsEnabled } from "./config";
import type { Session } from "./types";

/** The signed-in user, or null (always null until accounts are open). Reading it makes the page render per request. */
export async function getSession(): Promise<Session | null> {
  if (!accountsEnabled) return null;
  const s = await auth();
  if (!s?.user?.id) return null;
  const u = await prisma.user.findUnique({ where: { id: s.user.id } });
  if (!u || u.isSystem) return null;
  return {
    user: { id: u.id, email: u.email, name: u.name, accountType: u.accountType, platformRole: u.platformRole, plan: u.plan },
    expires: s.expires,
  };
}

export async function requireAdmin(): Promise<Session | null> {
  const s = await getSession();
  return s?.user.platformRole === "ADMIN" ? s : null;
}

/** Admins and reviewers can decide review tasks (never on versions they wrote, R4). */
export async function requireReviewer(): Promise<Session | null> {
  const s = await getSession();
  return s && (s.user.platformRole === "ADMIN" || s.user.platformRole === "REVIEWER") ? s : null;
}
