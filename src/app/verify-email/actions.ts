"use server";

import { redirect } from "next/navigation";
import { accountsEnabled, safeNext } from "@/lib/auth/config";
import { confirmEmail } from "@/lib/auth/flows";
import { closedMessage, field, type FormState } from "@/lib/auth/forms";
import { currentSessionToken, signInAs } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Confirms the address. The link proves the person owns it, so it also signs
 * them in, unless two-step login is on, which always needs its code.
 */
export async function confirmEmailAction(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const result = await confirmEmail(prisma, field(form, "token"));
  if (!result) return { error: "This link has expired or was already used. Sign in and ask for a new one from your dashboard." };
  const next = safeNext(field(form, "next"));
  if (result.twoStep) redirect(`/sign-in?verified=1${next === "/dashboard" ? "" : `&next=${encodeURIComponent(next)}`}`);
  const token = await currentSessionToken();
  const session = token ? await prisma.session.findUnique({ where: { sessionToken: token } }) : null;
  if (session?.userId !== result.userId) await signInAs(prisma, await prisma.user.findUniqueOrThrow({ where: { id: result.userId } }));
  // A new account lands on the tool it signed up from; the dashboard says the email is confirmed.
  redirect(next !== "/dashboard" ? next : result.alreadyVerified ? "/dashboard" : "/dashboard?verified=1");
}
