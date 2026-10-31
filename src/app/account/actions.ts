"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getSession } from "@/lib/auth/session";
import { accountTypes, type AccountType } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";

export interface ProfileState {
  error?: string;
}

/** Saves the name and account type a new account picks right after its first sign-in. */
export async function saveProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const accountType = String(form.get("accountType") ?? "") as AccountType;
  if (!name) return { error: "Enter your name." };
  if (!accountTypes.some((t) => t.value === accountType)) return { error: "Choose an account type." };
  await prisma.user.update({ where: { id: s.user.id }, data: { name, accountType } });
  redirect("/dashboard");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/** Deletes the account, its sessions, and its sign-in records. Audit rows keep the action but lose the actor. */
export async function deleteAccount(form: FormData) {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  if (s.user.platformRole !== "USER") redirect("/account?delete=staff");
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== s.user.email.toLowerCase()) redirect("/account?delete=mismatch");
  await prisma.$transaction([
    prisma.auditLog.create({ data: { actorId: null, action: "user.delete", entityType: "User", entityId: s.user.id } }),
    prisma.user.delete({ where: { id: s.user.id } }),
  ]);
  redirect("/?account=deleted");
}
