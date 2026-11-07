"use server";

import { redirect } from "next/navigation";
import { accountsEnabled } from "@/lib/auth/config";
import { emailChangeNotice, sendEmail } from "@/lib/auth/email";
import { confirmEmailChange } from "@/lib/auth/flows";
import { closedMessage, field, type FormState } from "@/lib/auth/forms";
import { prisma } from "@/lib/db/prisma";

/** Finishes an email change from the link sent to the new address, and tells the old one. */
export async function confirmEmailChangeAction(_: FormState, form: FormData): Promise<FormState> {
  if (!accountsEnabled) return { error: closedMessage };
  const result = await confirmEmailChange(prisma, field(form, "token"));
  if ("error" in result) return { error: result.error };
  await sendEmail(result.oldEmail, emailChangeNotice(result.email, true, new Date())).catch((e) => console.error("email changed notice failed", e instanceof Error ? e.message : e));
  redirect(result.oldEmail ? "/account?email=changed" : "/account?email=added");
}
