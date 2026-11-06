"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { googleEnabled } from "@/lib/auth/config";
import { appUrl, passwordChangedEmail, sendEmail, twoStepChangedEmail, verifyEmail } from "@/lib/auth/email";
import {
  beginTwoStep, changePassword, confirmTwoStep, disableTwoStep, regenerateBackupCodes, reissueVerification,
} from "@/lib/auth/flows";
import { field, textField, type FormState } from "@/lib/auth/forms";
import { claim, emailKey, release, rules } from "@/lib/auth/limits";
import { verifyPassword } from "@/lib/auth/password";
import { normalizePhone } from "@/lib/auth/phone";
import { currentSessionToken } from "@/lib/auth/server";
import { getSession } from "@/lib/auth/session";
import { accountTypes, type AccountType } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";

async function me() {
  const s = await getSession();
  if (!s) redirect("/sign-in?next=/account");
  return s;
}

/**
 * Security events on an account. The actor column stays empty: the audit log
 * is append-only, so a row pointing at the user would block deleting the account.
 */
const audit = (userId: string, action: string) => prisma.auditLog.create({ data: { actorId: null, action, entityType: "User", entityId: userId } });

export interface ProfileState { error?: string; saved?: boolean }

/** Name, company, and account type: asked after a first Google sign-in and editable in settings. */
export async function saveProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const s = await me();
  const name = textField(form, "name").trim().slice(0, 120);
  const company = textField(form, "company").trim().slice(0, 120) || null;
  const accountType = field(form, "accountType") as AccountType;
  if (!name) return { error: "Enter your name." };
  if (!accountTypes.some((t) => t.value === accountType)) return { error: "Choose an account type." };
  await prisma.user.update({ where: { id: s.user.id }, data: { name, company, accountType } });
  if (form.get("setup") === "1") redirect("/dashboard");
  revalidatePath("/account");
  return { saved: true };
}

export async function resendVerification(): Promise<FormState> {
  const s = await me();
  if (!s.user.email) return { error: "This account signs in with a phone number, so there's no email to confirm." };
  const tries = await claim(prisma, [[emailKey(s.user.email), rules.emailSend]]);
  if (!tries) return { error: "We've sent several links in the last hour. Use the newest one, or try again later." };
  const issued = await reissueVerification(prisma, s.user.id);
  if (!issued) {
    await release(prisma, tries);
    return { notice: "Your email is already confirmed." };
  }
  try {
    await sendEmail(issued.email, verifyEmail(appUrl(`/verify-email?token=${encodeURIComponent(issued.token)}`)));
  } catch (e) {
    console.error("verification email failed", e);
    return { error: "We couldn't send the email just now. Try again in a few minutes." };
  }
  return { notice: `We sent a new link to ${issued.email}.` };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const s = await me();
  const next = field(form, "password");
  if (next !== field(form, "confirm")) return { error: "The two new passwords don't match.", field: "confirm" };
  const result = await changePassword(prisma, s.user.id, field(form, "current"), next, { keepSessionToken: await currentSessionToken() });
  if (!result.ok) return { error: result.error, field: result.error?.startsWith("Your current") ? "current" : "password" };
  await audit(s.user.id, result.added ? "user.password-add" : "user.password-change");
  await sendEmail(result.email, passwordChangedEmail(new Date())).catch((e) => console.error("password-changed email failed", e));
  revalidatePath("/account");
  return { notice: result.added ? "Password added. You can now sign in with your email and password too." : "Password changed. Your other devices were signed out." };
}

export async function connectGoogle() {
  await me();
  if (!googleEnabled()) redirect("/account?google=off");
  await signIn("google", { redirectTo: "/account?google=connected" });
}

/** Disconnects Google, if the account can still sign in with a password. */
export async function disconnectGoogle() {
  const s = await me();
  if (!s.user.hasPassword) redirect("/account?google=need-password");
  await prisma.account.deleteMany({ where: { userId: s.user.id, provider: "google" } });
  await audit(s.user.id, "user.google-disconnect");
  redirect("/account?google=disconnected");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/**
 * Ends this session without redirecting. The header's Sign out calls it and then
 * reloads the page, so the header, the tool gates and the saved-work sync all start
 * fresh as signed out (the sync then clears the account's work from this browser).
 */
export async function signOutHere() {
  await signOut({ redirect: false });
}

/** Ends every session, this one included. */
export async function signOutEverywhere() {
  const s = await me();
  await prisma.session.deleteMany({ where: { userId: s.user.id } });
  await audit(s.user.id, "user.sign-out-everywhere");
  redirect("/sign-in?next=/account");
}

// ───────── Two-step login ─────────

export interface TwoStepState extends FormState { codes?: string[] }

export async function startTwoStep() {
  const s = await me();
  const r = await beginTwoStep(prisma, s.user.id);
  redirect(`/account/two-step${r.error ? `?error=${encodeURIComponent(r.error)}` : ""}`);
}

export async function confirmTwoStepAction(_: TwoStepState, form: FormData): Promise<TwoStepState> {
  const s = await me();
  const r = await confirmTwoStep(prisma, s.user.id, field(form, "code"));
  if ("error" in r) return { error: r.error };
  await audit(s.user.id, "user.two-step-on");
  await sendEmail(r.email, twoStepChangedEmail(true, new Date())).catch((e) => console.error("two-step email failed", e));
  return { codes: r.codes };
}

export async function disableTwoStepAction(_: TwoStepState, form: FormData): Promise<TwoStepState> {
  const s = await me();
  const r = await disableTwoStep(prisma, s.user.id, field(form, "code"));
  if ("error" in r) return { error: r.error };
  await audit(s.user.id, "user.two-step-off");
  await sendEmail(r.email, twoStepChangedEmail(false, new Date())).catch((e) => console.error("two-step email failed", e));
  redirect("/account?twostep=off");
}

export async function newBackupCodesAction(_: TwoStepState, form: FormData): Promise<TwoStepState> {
  const s = await me();
  const r = await regenerateBackupCodes(prisma, s.user.id, field(form, "code"));
  if ("error" in r) return { error: r.error };
  await audit(s.user.id, "user.backup-codes");
  return { codes: r.codes };
}

// ───────── Delete ─────────

/** Deletes the account and everything stored with it. Asks for the password when the account has one. */
export async function deleteAccount(_: FormState, form: FormData): Promise<FormState> {
  const s = await me();
  if (s.user.platformRole !== "USER") return { error: "Editor, reviewer, and admin accounts are removed by an admin, because their reviews stay on record." };
  const typed = field(form, "confirm").trim();
  if (s.user.email ? typed.toLowerCase() !== s.user.email.toLowerCase() : !s.user.phone || normalizePhone(typed) !== s.user.phone) {
    return { error: `The ${s.user.email ? "email" : "phone number"} you typed doesn't match this account, so nothing was deleted.` };
  }
  if (s.user.hasPassword) {
    const u = await prisma.user.findUniqueOrThrow({ where: { id: s.user.id } });
    if (!(await verifyPassword(u.passwordHash!, field(form, "password")))) return { error: "That password isn't right, so nothing was deleted." };
  }
  await prisma.$transaction([
    prisma.auditLog.create({ data: { actorId: null, action: "user.delete", entityType: "User", entityId: s.user.id } }),
    prisma.user.delete({ where: { id: s.user.id } }),
  ]);
  redirect("/?account=deleted");
}
