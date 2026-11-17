import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { ReviewerOnly, SourceNote, when, who } from "@/components/admin/ReviewerOnly";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { requireReviewer } from "@/lib/auth/session";
import { kindLabels, listTasks, PAGE_SIZE, queueCounts, statusLabels } from "@/lib/content/queue";
import { prisma } from "@/lib/db/prisma";
import { cn } from "@/lib/cn";
import type { ReviewKind, ReviewStatus } from "@prisma/client";

export const metadata: Metadata = withSocial({ title: "Review queue", robots: { index: false, follow: false } });

const kinds = Object.keys(kindLabels) as ReviewKind[];
const statusTone = (s: ReviewStatus) => (s === "APPROVED" ? "green" : s === "REJECTED" ? "red" : s === "SENT_BACK" ? "amber" : "gray");

type Search = Promise<{ kind?: string; view?: string; page?: string; done?: string }>;

export default async function ReviewQueuePage({ searchParams }: { searchParams: Search }) {
  const reviewer = await requireReviewer();
  const sp = await searchParams;
  const kind = kinds.includes(sp.kind as ReviewKind) ? (sp.kind as ReviewKind) : undefined;
  const decided = sp.view === "decided";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const header = (
    <PageHeader
      crumbs={[{ label: "Admin", href: "/admin" }, { label: "Review queue" }]} eyebrow="Internal" title="Review queue"
      icon={<ClipboardCheck className="h-7 w-7" />}
      description="Every proposed change waits here until a reviewer who didn't write it approves it. Nothing publishes without a citation to an official source."
    />
  );
  if (!reviewer) return <>{header}<div className="container-page py-10"><ReviewerOnly /></div></>;

  const [{ counts, total: openTotal }, { tasks, total }, done] = await Promise.all([
    queueCounts(prisma),
    listTasks(prisma, { kind, decided, page }),
    sp.done ? prisma.reviewTask.findUnique({ where: { id: sp.done }, select: { title: true, status: true } }) : null,
  ]);
  const href = (q: { kind?: ReviewKind; view?: string; page?: number }) => {
    const p = new URLSearchParams();
    if (q.kind) p.set("kind", q.kind);
    if (q.view) p.set("view", q.view);
    if (q.page && q.page > 1) p.set("page", String(q.page));
    const s = p.toString();
    return `/admin/review${s ? `?${s}` : ""}`;
  };
  const view = decided ? "decided" : undefined;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const chip = (active: boolean) => cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium", active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-white text-ink hover:border-brand-200");

  return (
    <>
      {header}
      <div className="container-page space-y-6 py-10">
        {done && (
          <p role="status" className="rounded-xl bg-eco-50 px-4 py-3 text-sm text-eco-700">{statusLabels[done.status]}: {done.title}</p>
        )}
        <SourceNote />
        <nav aria-label="Queue" className="flex flex-wrap items-center gap-2">
          <Link href={href({ kind })} className={chip(!decided)} aria-current={!decided ? "page" : undefined}>Waiting <span className="text-muted">{openTotal}</span></Link>
          <Link href={href({ kind, view: "decided" })} className={chip(decided)} aria-current={decided ? "page" : undefined}>Decided</Link>
          <span className="mx-2 h-5 w-px bg-line" aria-hidden="true" />
          <Link href={href({ view })} className={chip(!kind)}>All kinds</Link>
          {kinds.filter((k) => counts[k] || k === kind).map((k) => (
            <Link key={k} href={href({ kind: k, view })} className={chip(k === kind)}>
              {kindLabels[k]} {!decided && <span className="text-muted">{counts[k] ?? 0}</span>}
            </Link>
          ))}
        </nav>

        {tasks.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-8 text-center text-muted">{decided ? "No decided tasks yet." : "Nothing is waiting for review."}</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            {tasks.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/review/${t.id}`} className="flex flex-col gap-1.5 px-5 py-4 hover:bg-brand-50/50 sm:flex-row sm:items-center sm:gap-4">
                  <span className="flex shrink-0 items-center gap-2 sm:w-44">
                    <Badge tone={t.kind === "CHANGE" || t.kind === "NEW_RECORD" ? "blue" : t.kind === "SOURCE_CHANGED" ? "red" : "gray"}>
                      {t.kind === "CHANGE" && !t.versionId ? "Removal" : kindLabels[t.kind]}
                    </Badge>
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-ink">{t.title}</span>
                  <span className="shrink-0 text-sm text-muted">
                    {decided && t.decidedAt
                      ? <><Badge tone={statusTone(t.status)}>{statusLabels[t.status]}</Badge> {who(t.decidedBy)} · {when(t.decidedAt)}</>
                      : when(t.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between text-sm">
            {page > 1 ? <Link className="font-semibold text-brand-600" href={href({ kind, view, page: page - 1 })}>Newer</Link> : <span />}
            <span className="text-muted">Page {page} of {pages} · {total} tasks</span>
            {page < pages ? <Link className="font-semibold text-brand-600" href={href({ kind, view, page: page + 1 })}>Older</Link> : <span />}
          </nav>
        )}
      </div>
    </>
  );
}
