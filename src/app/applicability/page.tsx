import type { Metadata } from "next";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApplicabilityBadge, Badge, CitationBadge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Disclaimer, VerifyNotice } from "@/components/ui/Notices";
import { federalRegulations } from "@/lib/data/regulations";

export const metadata: Metadata = {
  title: "Air Regulatory Applicability Checker",
  description: "Screen potential NSPS, NESHAP, MACT, Title V, NSR, PSD, and state requirements with citations and clear status labels.",
  alternates: { canonical: "/applicability" },
};

const fields = ["Rule name", "Citation", "Why it may apply", "Key applicability criteria", "Potential monitoring", "Potential testing", "Potential recordkeeping", "Potential reporting", "Official source", "Last reviewed date"];

export default function ApplicabilityPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Applicability Checker" }]} eyebrow="Guided screening" title="Applicability Checker" icon={<ClipboardCheck className="h-7 w-7" />} description="A guided screen across federal and state programs. Each result shows a status, the citation, and what information would settle the question." />
      <div className="container-page space-y-10 py-10">
        <div className="flex flex-col gap-4 rounded-2xl bg-navy-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Start with your facility profile</h2>
            <p className="text-sm text-white/70">Screening currently runs inside the Permit Finder. The full rule-by-rule checker arrives with the regulatory database.</p>
          </div>
          <Link href="/permit-finder" className={buttonClass("primary", "lg")}>Run screening <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
        </div>

        <section>
          <h2 className="text-xl font-bold text-ink">Status labels</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <ApplicabilityBadge status="potentially-applicable" />
            <ApplicabilityBadge status="likely-not-applicable" />
            <ApplicabilityBadge status="more-info-needed" />
            <ApplicabilityBadge status="insufficient-info" />
          </div>
          <p className="mt-2 text-sm text-muted">AirPermitHub never labels a rule &quot;applicable&quot;. That determination belongs to you, your counsel, and the agency.</p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Federal requirements screened</h2>
            <ul className="mt-4 space-y-2">
              {federalRegulations.filter((r) => r.slug !== "ap-42").map((r) => (
                <li key={r.slug} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/regulations/${r.slug}`} className="font-medium text-ink hover:text-brand-600">{r.shortName}: {r.name}</Link>
                  <CitationBadge>{r.citation.split(";")[0]}</CitationBadge>
                </li>
              ))}
              <li className="text-sm text-muted">MACT standards are covered under NESHAP Part 63.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Every result will show</h2>
            <ul className="mt-4 flex flex-wrap gap-2">{fields.map((f) => <li key={f}><Badge tone="blue">{f}</Badge></li>)}</ul>
          </div>
        </section>
        <VerifyNotice />
        <Disclaimer variant="screening" />
      </div>
    </>
  );
}
