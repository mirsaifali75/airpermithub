"use server";

import { redirect } from "next/navigation";
import { accountsEnabled } from "@/lib/auth/config";
import { appUrl, resetPasswordEmail, sendEmail } from "@/lib/auth/email";
import { normalizeEmail, startReset, validEmail } from "@/lib/auth/flows";
import { closedMessage, field, type FormState } from "@/lib/auth/forms";
import { emailKey, networkKey, overLimit, record, rules } from "@/lib/auth/limits";
import { clientNetwork } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

/** Emails a reset link if the address has an account. The reply is the same either way. */
export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const email = normalizeEmail(field(form, "email"));
  if (!validEmail(email)) return { error: "Enter a valid email address.", values: { email } };
  const keys = [emailKey(email), networkKey(await clientNetwork())];
  if ((await overLimit(prisma, keys[1], rules.emailNetwork))) return { error: "Too many requests from this network. Try again in an hour.", values: { email } };
  if (!(await overLimit(prisma, keys[0], rules.emailSend))) {
    await record(prisma, keys, "email", true);
    const reset = await startReset(prisma, email);
    if (reset) {
      await sendEmail(reset.email, resetPasswordEmail(appUrl(`/reset-password?token=${encodeURIComponent(reset.token)}`))).catch((e) => console.error("reset email failed", e));
    }
  }
  redirect("/forgot-password?sent=1");
}
