"use client";

import { useActionState, useId } from "react";
import { decide, type DecisionState } from "@/app/admin/review/actions";
import { Button } from "@/components/ui/Button";
import type { Action } from "@/lib/content/queue";

const labels: Record<Action, string> = { approve: "Approve and publish", "send-back": "Send back", reject: "Reject", close: "Close with note" };

/** The reviewer's decision on one task. A note is required for everything but approving. */
export function DecisionForm({ taskId, actions, ownWork, approveLabel }: { taskId: string; actions: Action[]; ownWork: boolean; approveLabel?: string }) {
  const id = useId();
  const [state, action, pending] = useActionState<DecisionState, FormData>(decide, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="taskId" value={taskId} />
      <div>
        <label htmlFor={`${id}-note`} className="mb-1.5 block text-sm font-semibold text-ink">
          Note <span className="font-normal text-muted">({!actions.includes("approve") ? "required" : actions.length === 1 ? "optional" : "required to send back or reject"})</span>
        </label>
        <textarea
          id={`${id}-note`} name="note" rows={3} maxLength={2000}
          className="w-full rounded-xl border border-line px-3 py-2 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          placeholder="What you checked, or what the author should change."
        />
      </div>
      {ownWork && actions.includes("approve") && (
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">You wrote this, so someone else has to approve it (R4). You can still send it back or reject it.</p>
      )}
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{state.error}</p>}
      <div className="flex flex-wrap gap-3">
        {actions.map((a) => (
          <Button
            key={a} type="submit" name="decision" value={a} disabled={pending || (a === "approve" && ownWork)}
            variant={a === "approve" ? "primary" : "subtle"}
          >
            {a === "approve" && approveLabel ? approveLabel : labels[a]}
          </Button>
        ))}
      </div>
    </form>
  );
}
