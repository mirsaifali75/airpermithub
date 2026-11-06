"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { accountsEnabled } from "@/lib/auth/config";
import { passwordChangedEmail, sendEmail } from "@/lib/auth/email";
import { finishPhoneReset, finishReset } from "@/lib/auth/flows";
import { closedMessage, field, type FormState } from "@/lib/auth/forms";
import { claim, networkKey, phoneKey, release, rules, succeeded } from "@/lib/auth/limits";
import { clearCookie, clientNetwork, PHONE_RESET_COOKIE } from "@/lib/auth/server";
import { checkCode, cleanCode } from "@/lib/auth/sms";
import { prisma } from "@/lib/db/prisma";

/** Sets the new password, signs out every device, and sends the person to sign in with it. */
export async function setNewPassword(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const password = field(form, "password");
  if (password !== field(form, "confirm")) return { error: "The two passwords don't match.", field: "confirm" };
  const result = await finishReset(prisma, field(form, "token"), password);
  if ("error" in result) return { error: result.error, field: "password" };
  await sendEmail(result.email, passwordChangedEmail(new Date())).catch((e) => console.error("password-changed email failed", e));
  redirect("/sign-in?reset=1");
}

/** The same, from a texted code instead of an emailed link. */
export async function setNewPasswordByPhone(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const phone = (await cookies()).get(PHONE_RESET_COOKIE)?.value ?? "";
  if (!phone) return { error: "This reset has expired. Ask for a new code.", restart: true };
  const password = field(form, "password");
  if (password !== field(form, "confirm")) return { error: "The two passwords don't match.", field: "confirm" };
  const tries = await claim(prisma, [[phoneKey(phone), rules.phoneCode], [networkKey(await clientNetwork()), rules.twoStepNetwork]]);
  if (!tries) return { error: "Too many wrong codes. Wait an hour, then ask for a new code.", restart: true };
  const result = await finishPhoneReset(prisma, phone, cleanCode(field(form, "code")), password, checkCode);
  if ("error" in result) {
    // A password that isn't allowed is refused before the code is checked, so it isn't a wrong code.
    if (result.field === "password") await release(prisma, tries);
    if ("restart" in result) await clearCookie(PHONE_RESET_COOKIE, "/reset-password");
    return { error: result.error, field: result.field, restart: "restart" in result };
  }
  await succeeded(prisma, tries);
  await clearCookie(PHONE_RESET_COOKIE, "/reset-password");
  await sendEmail(result.email, passwordChangedEmail(new Date())).catch((e) => console.error("password-changed email failed", e));
  redirect("/sign-in?reset=1&method=phone");
}
