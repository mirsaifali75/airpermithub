import type { Session } from "./types";

/**
 * Returns the current session. Phase 1 has no auth provider, so this always
 * returns null and protected pages render their signed-out state.
 */
export async function getSession(): Promise<Session | null> {
  return null;
}

export async function requireAdmin(): Promise<Session | null> {
  const s = await getSession();
  return s?.user.accountType === "ADMIN" ? s : null;
}
