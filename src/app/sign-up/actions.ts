"use server";

import { redirect } from "next/navigation";
import { accountsEnabled, safeNext } from "@/lib/auth/config";
import { accountExistsEmail, appUrl, sendEmail, verifyEmail } from "@/lib/auth/email";
import { registerAccount } from "@/lib/auth/flows";
import { closedMessage, field, textField, type FormState } from "@/lib/auth/forms";
import { claim, emailKey, networkKey, rules } from "@/lib/auth/limits";
import { clientNetwork } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Creates an account and emails a confirmation link. When the address
 * already has an account, that address gets a note instead, and the visitor
 * sees the same "check your email" page either way.
 */
export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const values = { name: textField(form, "name"), email: field(form, "email").trim(), company: textField(form, "company"), accountType: field(form, "accountType") };
  if (form.get("terms") !== "on") return { error: "Agree to the Terms and Privacy Policy to continue.", field: "terms", values };

  if (!(await claim(prisma, [[networkKey(await clientNetwork()), rules.signUpNetwork]]))) return { error: "Too many sign-ups from this network. Try again in an hour.", values };

  const result = await registerAccount(prisma, { ...values, password: field(form, "password") });
  if ("error" in result) return { error: result.error, field: result.field, values };

  try {
    if (result.created) {
      const next = safeNext(field(form, "next"));
      const back = next === "/dashboard" ? "" : `&next=${encodeURIComponent(next)}`;
      await sendEmail(result.email, verifyEmail(appUrl(`/verify-email?token=${encodeURIComponent(result.verifyToken)}${back}`)));
    } else if (result.canSignIn && (await claim(prisma, [[emailKey(result.email), rules.emailSend]]))) {
      await sendEmail(result.email, accountExistsEmail());
    }
  } catch (e) {
    // The account exists either way; the person can ask for another link after signing in.
    console.error("sign-up email failed", e);
  }
  redirect("/sign-up/check-email");
}
