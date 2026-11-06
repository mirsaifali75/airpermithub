"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { accountsEnabled, safeNext } from "@/lib/auth/config";
import { sha256 } from "@/lib/auth/crypto";
import { accountExistsEmail, appUrl, sendEmail, verifyEmail } from "@/lib/auth/email";
import { finishPhoneSignup, pendingPhoneSignup, PHONE_SIGNUP_MINUTES, registerAccount, startPhoneSignup } from "@/lib/auth/flows";
import { closedMessage, field, textField, type FormState } from "@/lib/auth/forms";
import { claim, emailKey, networkKey, rules, succeeded } from "@/lib/auth/limits";
import { normalizePhone, phoneProblem } from "@/lib/auth/phone";
import { clearCookie, clientNetwork, PHONE_SIGNUP_COOKIE, setShortCookie, signInAs, textCode } from "@/lib/auth/server";
import { checkCode, cleanCode, phoneEnabled, type SendResult } from "@/lib/auth/sms";
import { prisma } from "@/lib/db/prisma";

const sendProblem = (r: Exclude<SendResult, "sent">) =>
  r === "too-many"
    ? "We've texted this number several codes in the last hour. Use the newest one, or try again later."
    : "We couldn't send a text to that number. Check the number and try again.";

/**
 * Creates an account. With an email: emails a confirmation link, or, when the
 * address already has an account, a note to that address instead, and the
 * visitor sees the same "check your email" page either way. With a phone
 * number: texts a code, and the account is made once the code comes back.
 */
export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const byPhone = field(form, "method") === "phone";
  const values = {
    method: byPhone ? "phone" : "email", name: textField(form, "name"), email: field(form, "email").trim(), phone: field(form, "phone").trim().slice(0, 40),
    company: textField(form, "company"), accountType: field(form, "accountType"),
  };
  if (form.get("terms") !== "on") return { error: "Agree to the Terms and Privacy Policy to continue.", field: "terms", values };
  if (byPhone) {
    if (!phoneEnabled()) return { error: "Signing up with a phone number isn't available yet. Use your email.", values };
    if (!normalizePhone(values.phone)) return { error: phoneProblem, field: "phone", values };
  }

  if (!(await claim(prisma, [[networkKey(await clientNetwork()), rules.signUpNetwork]]))) return { error: "Too many sign-ups from this network. Try again in an hour.", values };

  if (byPhone) {
    const started = await startPhoneSignup(prisma, { ...values, password: field(form, "password"), next: safeNext(field(form, "next")) });
    if ("error" in started) return { error: started.error, field: started.field, values };
    const sent = await textCode(prisma, started.phone);
    if (sent !== "sent") {
      await prisma.phoneSignup.deleteMany({ where: { id: sha256(started.token) } });
      return { error: sendProblem(sent), field: sent === "failed" ? "phone" : undefined, values };
    }
    await setShortCookie(PHONE_SIGNUP_COOKIE, started.token, "/sign-up", PHONE_SIGNUP_MINUTES);
    redirect("/sign-up/verify-phone");
  }

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

/**
 * The texted code that finishes a phone sign-up and signs the new account in.
 * If the number already has an account, the person (who just proved they hold
 * it) is sent to sign in instead.
 */
export async function confirmPhoneSignup(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const tries = await claim(prisma, [[networkKey(await clientNetwork()), rules.twoStepNetwork]]);
  if (!tries) return { error: "Too many wrong codes from this network. Wait 15 minutes and try again." };
  const token = (await cookies()).get(PHONE_SIGNUP_COOKIE)?.value ?? "";
  const result = await finishPhoneSignup(prisma, token, cleanCode(field(form, "code")), checkCode);
  if ("error" in result) {
    if (result.restart) await clearCookie(PHONE_SIGNUP_COOKIE, "/sign-up");
    return { error: result.error, restart: result.restart };
  }
  await succeeded(prisma, tries);
  await clearCookie(PHONE_SIGNUP_COOKIE, "/sign-up");
  if ("exists" in result) redirect("/sign-in?method=phone&exists=1");
  await signInAs(prisma, result.user);
  redirect(safeNext(result.next));
}

/** Texts the waiting sign-up a new code. */
export async function resendPhoneSignupCode(): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const pending = await pendingPhoneSignup(prisma, (await cookies()).get(PHONE_SIGNUP_COOKIE)?.value ?? "");
  if (!pending) return { error: "This sign-up has expired. Start again.", restart: true };
  const sent = await textCode(prisma, pending.phone);
  return sent === "sent" ? { notice: "We texted you a new code." } : { error: sendProblem(sent) };
}
