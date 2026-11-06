"use client";

import { useActionState } from "react";
import { removeHost, type HostState } from "@/app/admin/review/actions";
import { Button } from "@/components/ui/Button";

/** Takes one host off the official-source list, after a confirmation. */
export function HostRemoval({ host }: { host: string }) {
  const [state, action, pending] = useActionState<HostState, FormData>(removeHost, {});
  if (state.removed) {
    return (
      <span className="text-sm text-muted">
        Removed. {state.flagged ? `${state.flagged} published ${state.flagged === 1 ? "record lost its" : "records lost their"} official source and ${state.flagged === 1 ? "is" : "are"} now in the queue.` : "No published record relied on it."}
      </span>
    );
  }
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Take ${host} off the official-source list? Records citing only this host will be flagged for review.`)) e.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="domain" value={host} />
      <Button type="submit" size="sm" variant="subtle" disabled={pending}>{pending ? "Removing..." : "Remove from list"}</Button>
      {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
    </form>
  );
}
