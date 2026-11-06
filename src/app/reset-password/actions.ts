"use server";

import { redirect } from "next/navigation";
import { accountsEnabled } from "@/lib/auth/config";
import { passwordChangedEmail, sendEmail } from "@/lib/auth/email";
import { finishReset } from "@/lib/auth/flows";
import { closedMessage, field, type FormState } from "@/lib/auth/forms";
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
