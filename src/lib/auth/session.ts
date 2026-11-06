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
    user: {
      id: u.id, email: u.email, phone: u.phone, name: u.name, company: u.company, accountType: u.accountType, platformRole: u.platformRole, plan: u.plan,
      emailVerified: !!u.emailVerified, phoneVerified: !!u.phoneVerified, hasPassword: !!u.passwordHash, twoStep: !!u.twoFactorEnabledAt,
    },
    expires: s.expires,
  };
}

const isStaff = (s: Session) => s.user.platformRole === "ADMIN" || s.user.platformRole === "REVIEWER";

/** Admin pages need the admin role and two-step login. */
export async function requireAdmin(): Promise<Session | null> {
  const s = await getSession();
  return s?.user.platformRole === "ADMIN" && s.user.twoStep ? s : null;
}

/** Admins and reviewers with two-step login on can decide review tasks (never on versions they wrote, R4). */
export async function requireReviewer(): Promise<Session | null> {
  const s = await getSession();
  return s && isStaff(s) && s.user.twoStep ? s : null;
}

/** Staff who still need to turn on two-step login before the admin pages open. */
export async function staffNeedsTwoStep() {
  const s = await getSession();
  return !!s && isStaff(s) && !s.user.twoStep;
}
