import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck, ExternalLink, ShieldCheck, ShieldOff } from "lucide-react";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { HostRemoval } from "@/components/admin/HostRemoval";
import { ReviewerOnly, SourceNote, when, who } from "@/components/admin/ReviewerOnly";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { requireReviewer } from "@/lib/auth/session";
import { hostRows, isOpen, kindLabels, statusLabels, taskDetail, versionStatusLabels, type CitationRow, type FieldRow } from "@/lib/content/queue";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = withSocial({ title: "Review task", robots: { index: false, follow: false } });

const card = "rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6";

function Value({ text }: { text: string | null }) {
  if (text === null) return <span className="text-muted italic">empty</span>;
  return <span className="block max-h-80 overflow-auto whitespace-pre-wrap break-words font-[inherit]">{text}</span>;
}

function Fields({ rows, compare }: { rows: FieldRow[]; compare: boolean }) {
  const changed = rows.filter((r) => r.changed);
  const same = rows.filter((r) => !r.changed);
  // A grid rather than a table, so on a phone each field stacks its old and new values.
  const table = (list: FieldRow[], showBoth: boolean) => {
    const cols = showBoth ? "sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]" : "sm:grid-cols-[10rem_minmax(0,1fr)]";
    const tag = "mb-1 block text-xs font-semibold tracking-wide text-muted uppercase sm:hidden";
    return (
      <div className="text-sm">
        <div className={`hidden gap-4 pb-2 text-xs font-semibold tracking-wide text-muted uppercase sm:grid ${cols}`}>
          <span>Field</span>{showBoth && <span>On the site now</span>}<span>{showBoth ? "Proposed" : "Value"}</span>
        </div>
        <dl className="divide-y divide-line border-t border-line">
          {list.map((r) => (
            <div key={r.field} className={`grid gap-2 py-3 sm:gap-4 ${cols}`}>
              <dt className="font-semibold text-ink">{r.field}</dt>
              {showBoth && <dd className="rounded-lg bg-red-50/60 p-2 text-ink"><span className={tag}>On the site now</span><Value text={r.before} /></dd>}
              <dd className={showBoth ? "rounded-lg bg-eco-50/70 p-2 text-ink" : "text-ink"}>{showBoth && <span className={tag}>Proposed</span>}<Value text={r.after ?? r.before} /></dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };
  if (!compare) return table(rows, false);
  return (
    <>
      {changed.length ? table(changed, true) : <p className="text-sm text-muted">No field changes. Only the citations or the status differ.</p>}
      {same.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-brand-600">{same.length} unchanged fields</summary>
          <div className="mt-3">{table(same, false)}</div>
        </details>
      )}
    </>
  );
}

function Citations({ rows }: { rows: CitationRow[] }) {
  if (!rows.length) return <p className="text-sm text-muted">No citations.</p>;
  return (
    <ul className="space-y-3 text-sm">
      {rows.map((c) => (
        <li key={c.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
          <span className="flex shrink-0 items-center gap-2 sm:w-48">
            <Badge tone="gray">{c.role.charAt(0) + c.role.slice(1).toLowerCase().replace("_", " ")}</Badge>
            {c.source.isOfficial
              ? <Badge tone="green" icon={<ShieldCheck className="h-3.5 w-3.5" />}>Official</Badge>
              : <Badge tone="amber" icon={<ShieldOff className="h-3.5 w-3.5" />}>Not official</Badge>}
          </span>
          <span className="min-w-0">
            <a href={c.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium break-all text-brand-600 hover:underline">
              {c.label ?? c.source.title} <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
            {c.pinpoint && <span className="text-muted"> · {c.pinpoint}</span>}
            {c.verbatimQuote && <blockquote className="mt-1 border-l-2 border-line pl-3 text-muted">{c.verbatimQuote}</blockquote>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function ReviewTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const reviewer = await requireReviewer();
  const crumbs = [{ label: "Admin", href: "/admin" }, { label: "Review queue", href: "/admin/review" }, { label: "Task" }];
  if (!reviewer) {
    return (
      <>
        <PageHeader crumbs={crumbs} eyebrow="Internal" title="Review task" icon={<ClipboardCheck className="h-7 w-7" />} />
        <div className="container-page py-10"><ReviewerOnly /></div>
      </>
    );
  }
  const d = await taskDetail(prisma, (await params).id, reviewer.user.id);
  if (!d) notFound();
  const { task } = d;
  const hosts = task.kind === "OFFICIAL_DOMAIN" ? await hostRows(prisma, task.detail) : [];
  const shownVersion = d.isRemoval ? d.previous : d.proposed;

  return (
    <>
      <PageHeader
        crumbs={crumbs} eyebrow={d.isRemoval ? "Removal" : kindLabels[task.kind]} title={task.title} icon={<ClipboardCheck className="h-7 w-7" />}
        description={<>Opened {when(task.createdAt)}{d.record && <> · {d.record.href ? <Link href={d.record.href} className="font-semibold text-brand-600 hover:underline">{d.record.label}</Link> : d.record.label}</>}</>}
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={isOpen(task.status) ? "blue" : task.status === "APPROVED" ? "green" : task.status === "REJECTED" ? "red" : "gray"}>{statusLabels[task.status]}</Badge>
          {d.proposed && <Badge tone="gray">Version {d.proposed.versionNo} · {versionStatusLabels[d.proposed.status]}</Badge>}
        </div>
      </PageHeader>

      <div className="container-page grid gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {task.detail && task.kind !== "OFFICIAL_DOMAIN" && !(d.isProposal && task.versionId) && (
            <section className={card}>
              <h2 className="font-semibold text-ink">About this task</h2>
              <p className="mt-2 text-sm whitespace-pre-wrap text-muted">{task.detail}</p>
            </section>
          )}

          {task.kind === "OFFICIAL_DOMAIN" && (
            <section className={card}>
              <h2 className="font-semibold text-ink">Hosts outside .gov counted as official</h2>
              <p className="mt-1 text-sm text-muted">Check that each host is the agency&apos;s own site. Take off any that isn&apos;t; records that cited only that host come back to this queue. Approve once the rest are right.</p>
              <ul className="mt-4 divide-y divide-line text-sm">
                {hosts.map((h) => (
                  <li key={h.host} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <a href={`https://${h.host}`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 hover:underline">{h.host}</a>
                      <span className="text-muted"> · {h.sources} {h.sources === 1 ? "source" : "sources"}{h.jurisdiction && ` · ${h.jurisdiction.toLowerCase()}`}</span>
                    </span>
                    {h.listed ? (isOpen(task.status) && <HostRemoval host={h.host} />) : <Badge tone="gray">Removed</Badge>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {d.entity && shownVersion && (
            <section className={card}>
              <h2 className="font-semibold text-ink">
                {d.isRemoval ? "What comes off the site" : d.isProposal ? (d.previous ? "What changes" : "The new record") : `Version ${shownVersion.versionNo}`}
              </h2>
              {d.proposed?.revisionNotes && d.isProposal && <p className="mt-1 text-sm text-muted">{d.proposed.revisionNotes}</p>}
              <div className="mt-4"><Fields rows={d.fields} compare={d.isProposal && !!d.previous} /></div>
            </section>
          )}

          {shownVersion && (
            <section className={card}>
              <h2 className="font-semibold text-ink">Citations{d.isProposal ? " in the proposed version" : ""}</h2>
              <p className="mt-1 text-sm text-muted">Publishing needs at least one citation to an official source (R1).</p>
              <div className="mt-4"><Citations rows={shownVersion.citations} /></div>
            </section>
          )}

          {d.audit.length > 0 && (
            <section className={card}>
              <h2 className="font-semibold text-ink">Audit trail</h2>
              <ol className="mt-3 space-y-2 text-sm">
                {d.audit.map((a) => (
                  <li key={a.id} className="flex flex-wrap gap-x-2 text-muted">
                    <span className="font-medium text-ink">{a.action}</span> by {who(a.actor)} · {when(a.createdAt)}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className={card}>
            <h2 className="font-semibold text-ink">Decision</h2>
            {isOpen(task.status) ? (
              d.actions.length ? (
                <div className="mt-4 space-y-4">
                  {d.isProposal && <SourceNote />}
                  <DecisionForm taskId={task.id} actions={d.actions} ownWork={d.ownWork} approveLabel={d.isRemoval ? "Approve removal" : task.kind === "OFFICIAL_DOMAIN" ? "Confirm the list" : undefined} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  {task.kind === "RESTATED_THRESHOLD"
                    ? "This closes on its own when a version with the verbatim threshold text is approved."
                    : "No decision is needed here."}
                </p>
              )
            ) : (
              <div className="mt-2 space-y-1 text-sm text-muted">
                <p><span className="font-semibold text-ink">{statusLabels[task.status]}</span>{task.decidedBy && ` by ${who(task.decidedBy)}`}{task.decidedAt && ` · ${when(task.decidedAt)}`}</p>
                {task.decisionNote && <p className="whitespace-pre-wrap">{task.decisionNote}</p>}
              </div>
            )}
          </section>

          {d.proposed && (
            <section className={card}>
              <h2 className="font-semibold text-ink">Author</h2>
              <p className="mt-2 text-sm text-muted">{who(d.proposed.author)} · {when(d.proposed.createdAt)}</p>
            </section>
          )}

          {d.history.length > 0 && (
            <section className={card}>
              <h2 className="font-semibold text-ink">Version history</h2>
              <ol className="mt-3 space-y-1.5 text-sm">
                {d.history.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    <span className={v.id === d.proposed?.id ? "font-semibold text-ink" : "text-muted"}>Version {v.versionNo}</span>
                    <Badge tone={v.status === "PUBLISHED" ? "green" : v.status === "IN_REVIEW" ? "blue" : v.status === "REJECTED" ? "red" : "gray"}>{versionStatusLabels[v.status]}</Badge>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
