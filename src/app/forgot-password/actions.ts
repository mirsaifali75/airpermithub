"use server";

import { redirect } from "next/navigation";
import { accountsEnabled } from "@/lib/auth/config";
import { appUrl, resetPasswordEmail, sendEmail } from "@/lib/auth/email";
import { normalizeEmail, phoneCanReset, startReset, validEmail } from "@/lib/auth/flows";
import { closedMessage, field, type FormState } from "@/lib/auth/forms";
import { claim, emailKey, networkKey, rules } from "@/lib/auth/limits";
import { normalizePhone, phoneProblem } from "@/lib/auth/phone";
import { clientNetwork, PHONE_RESET_COOKIE, setShortCookie, textCode } from "@/lib/auth/server";
import { phoneEnabled } from "@/lib/auth/sms";
import { prisma } from "@/lib/db/prisma";

/** Emails a reset link (or texts a code) if the address or number has an account. The reply is the same either way. */
export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  if (field(form, "method") === "phone") return requestPhoneReset(form);
  const email = normalizeEmail(field(form, "email"));
  if (!validEmail(email)) return { error: "Enter a valid email address.", values: { email } };
  if (!(await claim(prisma, [[networkKey(await clientNetwork()), rules.emailNetwork]]))) return { error: "Too many requests from this network. Try again in an hour.", values: { email } };
  if (await claim(prisma, [[emailKey(email), rules.emailSend]])) {
    const reset = await startReset(prisma, email);
    if (reset) {
      await sendEmail(reset.email, resetPasswordEmail(appUrl(`/reset-password?token=${encodeURIComponent(reset.token)}`))).catch((e) => console.error("reset email failed", e));
    }
  }
  redirect("/forgot-password?sent=1");
}

async function requestPhoneReset(form: FormData): Promise<FormState> {
  const raw = field(form, "phone").trim().slice(0, 40);
  const values = { method: "phone", phone: raw };
  if (!phoneEnabled()) return { error: "Resetting by text isn't available yet.", values };
  const phone = normalizePhone(raw);
  if (!phone) return { error: phoneProblem, field: "phone", values };
  // Every request counts against this network, account or not, so numbers can't be tried freely.
  if (!(await claim(prisma, [[networkKey(await clientNetwork()), rules.smsNetwork]]))) return { error: "Too many requests from this network. Try again in an hour.", values };
  if (await phoneCanReset(prisma, phone)) await textCode(prisma, phone, { networkCounted: true });
  await setShortCookie(PHONE_RESET_COOKIE, phone, "/reset-password", 15);
  redirect("/reset-password/phone");
}
