import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Database, History, Lock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ReviewerOnly } from "@/components/admin/ReviewerOnly";
import { requireReviewer, staffNeedsTwoStep } from "@/lib/auth/session";
import { kindLabels, queueCounts } from "@/lib/content/queue";
import { prisma } from "@/lib/db/prisma";
import type { ReviewKind } from "@prisma/client";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const modules = [
  { title: "Regulations", items: ["Add / update regulations", "Version history & effective dates", "Track last-reviewed dates"], model: "Regulation, RegulationVersion" },
  { title: "Sources", items: ["Manage source documents", "Verify official URLs"], model: "Source" },
  { title: "Emission factors", items: ["Add factors with provenance", "Review calculation methodologies"], model: "EmissionFactor, CalculationMethod" },
  { title: "States & agencies", items: ["Manage states", "Manage agencies & programs"], model: "State, RegulatoryAgency" },
  { title: "Permits & resources", items: ["Manage permits & documents", "Manage resources & templates"], model: "Permit, PermitDocument, Resource, Template" },
  { title: "Jobs", items: ["Moderate job postings"], model: "Job" },
  { title: "Users", items: ["Manage users & organizations"], model: "User, Organization, Membership" },
  { title: "Quality", items: ["Review reported errors", "Publish announcements", "Audit log"], model: "ErrorReport, Announcement, AuditLog" },
];

export default async function AdminPage() {
  const reviewer = await requireReviewer();
  const queue = reviewer ? await queueCounts(prisma) : null;
  return (
    <>
      <PageHeader crumbs={[{ label: "Admin" }]} eyebrow="Internal" title="Admin Console" icon={<ShieldCheck className="h-7 w-7" />} description="Editorial and data-management tools. Every change to regulatory content is versioned and attributed." />
      <div className="container-page space-y-6 py-10">
        {!reviewer && (await staffNeedsTwoStep() ? <ReviewerOnly /> : (
          <p className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted"><Lock className="h-4 w-4" aria-hidden="true" /> Admin access requires a signed-in admin or reviewer account. This page shows the planned module map.</p>
        ))}
        {queue && (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Link href="/admin/review" className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card hover:border-brand-200">
              <span className="flex items-center gap-2 font-semibold text-ink"><ClipboardCheck className="h-5 w-5 text-brand-600" aria-hidden="true" /> Review queue <Badge tone="blue">{queue.total} waiting</Badge></span>
              <span className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                {(Object.keys(kindLabels) as ReviewKind[]).filter((k) => queue.counts[k]).map((k) => <span key={k}>{kindLabels[k]}: <span className="font-semibold text-ink">{queue.counts[k]}</span></span>)}
              </span>
            </Link>
            <Link href="/admin/audit" className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card hover:border-brand-200">
              <span className="flex items-center gap-2 font-semibold text-ink"><History className="h-5 w-5 text-brand-600" aria-hidden="true" /> Audit log</span>
              <span className="mt-3 text-sm text-muted">Every publish and decision, newest first.</span>
            </Link>
          </section>
        )}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <li key={m.title} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
              <h2 className="font-semibold text-ink">{m.title}</h2>
              <ul className="mt-2 flex-1 space-y-1 text-sm text-muted">{m.items.map((i) => <li key={i}>{i}</li>)}</ul>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-navy-700"><Database className="h-3.5 w-3.5" aria-hidden="true" /> {m.model}</p>
              <Badge tone="gray" className="mt-3 self-start">Planned</Badge>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
