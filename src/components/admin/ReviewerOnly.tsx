import { Lock } from "lucide-react";

/** Shown in place of a review page to anyone who isn't signed in as a reviewer or admin. */
export function ReviewerOnly() {
  return (
    <p className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted">
      <Lock className="h-4 w-4" aria-hidden="true" /> The review queue is open to signed-in reviewers and admins.
    </p>
  );
}

/** The live site still reads the reviewed files in the repository; say so wherever a reviewer publishes. */
export function SourceNote() {
  return (
    <p className="rounded-xl border border-line bg-slate-50 px-4 py-3 text-sm text-muted">
      Approving publishes the version in the database. The public pages still read the reviewed files in the repository, so an approved change reaches the site once the site switches to the database.
    </p>
  );
}

export const when = (d: Date) => d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
export const who = (u: { name: string | null; email: string; isSystem?: boolean } | null) => (u ? (u.isSystem ? "Import (system)" : u.name || u.email) : "System");
