"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { clientKey, createRateLimiter } from "@/lib/api/rate-limit";
import { accountsEnabled, safeNext } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export interface LinkState {
  error?: string;
}

const perClient = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });
/** Unused links per address at once; each expires after LINK_MINUTES. */
const MAX_OPEN_LINKS = 3;

/** Emails a one-time sign-in link. New addresses get an account when they click it. */
export async function requestSignInLink(_: LinkState, form: FormData): Promise<LinkState> {
  if (!accountsEnabled) return { error: "Accounts are not open yet. Every tool works without one." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };

  if (!perClient.check(clientKey({ headers: await headers() })).allowed) {
    return { error: "Too many sign-in requests from this connection. Try again in a few minutes." };
  }
  const open = await prisma.verificationToken.count({ where: { identifier: email, expires: { gt: new Date() } } });
  if (open >= MAX_OPEN_LINKS) return { error: "We've already sent several links to this address. Use the newest one, or try again in 15 minutes." };

  try {
    await signIn("resend", { email, redirectTo: safeNext(form.get("next")), redirect: false });
  } catch (e) {
    if (e instanceof AuthError) return { error: "We couldn't send the link just now. Try again in a few minutes." };
    throw e;
  }
  redirect("/sign-in/check-email");
}
