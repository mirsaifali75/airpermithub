"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { accountsEnabled, googleEnabled, safeNext } from "@/lib/auth/config";
import { answerChallenge, checkPassword, checkPhonePassword, createChallenge, normalizeEmail } from "@/lib/auth/flows";
import { closedMessage, field, type FormState } from "@/lib/auth/forms";
import { claim, emailKey, networkKey, phoneKey, rules, succeeded } from "@/lib/auth/limits";
import { normalizePhone } from "@/lib/auth/phone";
import { clientNetwork, signInAs } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

const tooMany = "Too many sign-in attempts. Wait 15 minutes, or reset your password.";

/** Email (or phone number) and password. Accounts with two-step login go on to the code step. */
export async function signInWithPassword(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const password = field(form, "password");
  const next = safeNext(field(form, "next"));
  const byPhone = field(form, "method") === "phone";
  const rawPhone = field(form, "phone").trim().slice(0, 40);
  const phone = byPhone ? normalizePhone(rawPhone) : null;
  const email = byPhone ? "" : normalizeEmail(field(form, "email"));
  const values: Record<string, string> = byPhone ? { method: "phone", phone: rawPhone } : { method: "email", email };
  if (byPhone ? !rawPhone || !password : !email || !password) return { error: `Enter your ${byPhone ? "phone number" : "email"} and password.`, values };

  // A number that can't be an account still counts against this network, so guessing numbers costs tries too.
  const account = byPhone ? phoneKey(phone ?? rawPhone) : emailKey(email);
  const tries = await claim(prisma, [[account, rules.signInEmail], [networkKey(await clientNetwork()), rules.signInNetwork]]);
  if (!tries) return { error: tooMany, values };

  const user = byPhone ? await checkPhonePassword(prisma, rawPhone, password) : await checkPassword(prisma, email, password);
  if (!user) {
    return {
      error: byPhone ? "That phone number and password don't match." : "That email and password don't match. If you signed up with Google, use Continue with Google.",
      values,
    };
  }
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
