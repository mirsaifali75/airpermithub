import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { ReviewerOnly, when, who } from "@/components/admin/ReviewerOnly";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireReviewer } from "@/lib/auth/session";
import { auditPage, PAGE_SIZE } from "@/lib/content/queue";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Audit log", robots: { index: false, follow: false } };

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const reviewer = await requireReviewer();
  const header = (
    <PageHeader
      crumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit log" }]} eyebrow="Internal" title="Audit log" icon={<History className="h-7 w-7" />}
      description="Every publish, decision, and change to the official-source list, newest first. Rows can't be edited or deleted."
    />
  );
  if (!reviewer) return <>{header}<div className="container-page py-10"><ReviewerOnly /></div></>;

  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const { rows, total } = await auditPage(prisma, page);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const after = (v: unknown) => {
    if (!v || typeof v !== "object") return null;
    const { taskId, note } = v as { taskId?: string; note?: string | null };
    return { taskId, note: note ?? null };
  };

  return (
    <>
      {header}
      <div className="container-page space-y-6 py-10">
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-5 py-3 font-semibold">When</th><th className="px-5 py-3 font-semibold">Who</th><th className="px-5 py-3 font-semibold">Action</th><th className="px-5 py-3 font-semibold">Record</th></tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {rows.map((r) => {
                const a = after(r.after);
                return (
                  <tr key={r.id}>
                    <td className="px-5 py-3 whitespace-nowrap text-muted">{when(r.createdAt)}</td>
                    <td className="px-5 py-3 text-ink">{who(r.actor)}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-ink">{r.action}</span>
                      {a?.note && <span className="block text-muted">{a.note}</span>}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {r.entityType}
                      {a?.taskId && <> · <Link href={`/admin/review/${a.taskId}`} className="font-semibold text-brand-600 hover:underline">task</Link></>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between text-sm">
            {page > 1 ? <Link className="font-semibold text-brand-600" href={`/admin/audit?page=${page - 1}`}>Newer</Link> : <span />}
            <span className="text-muted">Page {page} of {pages} · {total} entries</span>
            {page < pages ? <Link className="font-semibold text-brand-600" href={`/admin/audit?page=${page + 1}`}>Older</Link> : <span />}
          </nav>
        )}
      </div>
    </>
  );
}
