"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { field } from "@/lib/auth/forms";
import { requireReviewer } from "@/lib/auth/session";
import { approveTask, closeTask, declineTask, removeOfficialDomain, ReviewError } from "@/lib/content/review";
import { prisma } from "@/lib/db/prisma";

export type DecisionState = { error?: string };
export type HostState = { error?: string; flagged?: number; removed?: boolean };

const NOTE_MAX = 2000;

/** Approve, send back, reject, or close one review task. The database enforces R1 to R4 whatever this allows. */
export async function decide(_: DecisionState, form: FormData): Promise<DecisionState> {
  const session = await requireReviewer();
  if (!session) return { error: "Sign in with a reviewer account to decide review tasks." };
  const taskId = field(form, "taskId");
  const decision = field(form, "decision");
  const note = field(form, "note").trim().slice(0, NOTE_MAX) || undefined;
  try {
    if (decision === "approve") await approveTask(prisma, taskId, session.user.id, note);
    else if (decision === "send-back") await declineTask(prisma, taskId, session.user.id, "SENT_BACK", note);
    else if (decision === "reject") await declineTask(prisma, taskId, session.user.id, "REJECTED", note);
    else if (decision === "close") await closeTask(prisma, taskId, session.user.id, note);
    else return { error: "Choose a decision." };
  } catch (e) {
    if (e instanceof ReviewError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/review?done=${encodeURIComponent(taskId)}`);
}

/** Takes one host off the official-source list and flags the records that relied on it. */
export async function removeHost(_: HostState, form: FormData): Promise<HostState> {
  const session = await requireReviewer();
  if (!session) return { error: "Sign in with a reviewer account to change the official-source list." };
  const domain = field(form, "domain").trim().toLowerCase();
  try {
    // No revalidation here: re-rendering would swap the row for its "Removed" badge before the reviewer sees the count.
    return { removed: true, flagged: await removeOfficialDomain(prisma, domain, session.user.id) };
  } catch (e) {
    if (e instanceof ReviewError) return { error: e.message };
    throw e;
  }
}
