import type { Metadata } from "next";
import { Database, Lock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { requireAdmin } from "@/lib/auth/session";

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
  const admin = await requireAdmin();
  return (
    <>
      <PageHeader crumbs={[{ label: "Admin" }]} eyebrow="Internal" title="Admin Console" icon={<ShieldCheck className="h-7 w-7" />} description="Editorial and data-management tools. Every change to regulatory content is versioned and attributed." />
      <div className="container-page space-y-6 py-10">
        {!admin && (
          <p className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted"><Lock className="h-4 w-4" aria-hidden="true" /> Admin access requires an ADMIN account. This page shows the planned module map.</p>
        )}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <li key={m.title} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
              <h2 className="font-semibold text-ink">{m.title}</h2>
              <ul className="mt-2 flex-1 space-y-1 text-sm text-muted">{m.items.map((i) => <li key={i}>{i}</li>)}</ul>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-navy-700"><Database className="h-3.5 w-3.5" aria-hidden="true" /> {m.model}</p>
              <Badge tone="gray" className="mt-3 self-start">Phase 2</Badge>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
