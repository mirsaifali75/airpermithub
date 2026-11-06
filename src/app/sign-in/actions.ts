"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { accountsEnabled, googleEnabled, safeNext } from "@/lib/auth/config";
import { answerChallenge, checkPassword, createChallenge, normalizeEmail } from "@/lib/auth/flows";
import { closedMessage, field, type FormState } from "@/lib/auth/forms";
import { claim, emailKey, networkKey, rules, succeeded } from "@/lib/auth/limits";
import { clientNetwork, signInAs } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

const tooMany = "Too many sign-in attempts. Wait 15 minutes, or reset your password.";

/** Email and password. Accounts with two-step login go on to the code step. */
export async function signInWithPassword(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const email = normalizeEmail(field(form, "email"));
  const password = field(form, "password");
  const next = safeNext(field(form, "next"));
  const values = { email };
  if (!email || !password) return { error: "Enter your email and password.", values };

  const tries = await claim(prisma, [[emailKey(email), rules.signInEmail], [networkKey(await clientNetwork()), rules.signInNetwork]]);
  if (!tries) return { error: tooMany, values };

  const user = await checkPassword(prisma, email, password);
  if (!user) return { error: "That email and password don't match. If you signed up with Google, use Continue with Google.", values };
  await succeeded(prisma, tries);
  if (user.twoFactorEnabledAt) redirect(`/sign-in/two-step?c=${encodeURIComponent(await createChallenge(prisma, user.id, next))}`);
  await signInAs(prisma, user);
  redirect(next);
}

/** The code from an authenticator app, or a backup code. */
export async function answerTwoStep(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const tries = await claim(prisma, [[networkKey(await clientNetwork()), rules.twoStepNetwork]]);
  if (!tries) return { error: "Too many wrong codes from this network. Wait 15 minutes and sign in again.", restart: true };
  const result = await answerChallenge(prisma, field(form, "c"), field(form, "code"));
  if ("error" in result) return { error: result.error, restart: result.restart };
  await succeeded(prisma, tries);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: result.userId } });
  await signInAs(prisma, user);
  redirect(safeNext(result.next));
}

/** Hands off to Google; Auth.js brings the person back signed in, or to the code step. */
export async function continueWithGoogle(form: FormData) {
  if (!accountsEnabled || !googleEnabled()) redirect("/sign-in?error=GoogleOff");
  await signIn("google", { redirectTo: safeNext(field(form, "next")) });
}
