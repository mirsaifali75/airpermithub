import type { Metadata } from "next";
import { LayoutDashboard, Lock } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ComplianceBadge, DemoBadge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { getSession } from "@/lib/auth/session";
import { demoFacilities } from "@/lib/data/compliance";

export const metadata: Metadata = { title: "My Dashboard", robots: { index: false } };

const facilitySections = ["General Information", "Equipment", "Emission Sources", "Calculations", "Permits", "Regulations", "Compliance Obligations", "Tasks", "Documents", "Contacts", "History"];

export default async function DashboardPage() {
  const session = await getSession();
  return (
    <>
      <PageHeader crumbs={[{ label: "Dashboard" }]} eyebrow="Workspace" title="My Facilities" icon={<LayoutDashboard className="h-7 w-7" />} description="Facilities, permits, potential emissions, compliance status, deadlines, tasks, and documents in one place." />
      <div className="container-page space-y-8 py-10">
        {!session && (
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 text-brand-500" aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-ink">Sign in to manage facilities</h2>
                <p className="text-sm text-muted">Facility workspaces open with accounts in Phase 2. Below is a preview with demo data.</p>
              </div>
            </div>
            <Link href="/sign-up" className={buttonClass("primary")}>Create free account</Link>
          </div>
        )}
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-3"><h2 className="font-semibold text-ink">Facilities</h2><DemoBadge /></div>
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-canvas text-left text-xs text-muted uppercase"><tr><th className="px-5 py-2.5">Facility</th><th className="px-5 py-2.5">Location</th><th className="px-5 py-2.5">Permit status</th><th className="px-5 py-2.5">Open tasks</th><th className="px-5 py-2.5">Compliance</th></tr></thead>
            <tbody className="divide-y divide-line">
              {demoFacilities.map((f) => (
                <tr key={f.name}><td className="px-5 py-3 font-medium text-ink">{f.name}</td><td className="px-5 py-3">{f.location}</td><td className="px-5 py-3">{f.permitStatus}</td><td className="px-5 py-3">{f.openTasks}</td><td className="px-5 py-3"><ComplianceBadge status={f.status} /></td></tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-line md:hidden">
            {demoFacilities.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 px-5 py-3"><span><span className="block font-medium text-ink">{f.name}</span><span className="text-xs text-muted">{f.location} · {f.openTasks} open tasks</span></span><ComplianceBadge status={f.status} /></li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="font-semibold text-ink">Each facility will contain</h2>
          <ul className="mt-3 flex flex-wrap gap-2">{facilitySections.map((s) => <li key={s} className="rounded-lg bg-canvas px-3 py-1.5 text-sm text-slate-700">{s}</li>)}</ul>
        </div>
      </div>
    </>
  );
}
