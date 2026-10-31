import type { Metadata } from "next";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApplicabilityScreener } from "@/components/tools/ApplicabilityScreener";
import { ApplicabilityBadge, Badge } from "@/components/ui/Badge";
import { Disclaimer, VerifyNotice } from "@/components/ui/Notices";
import { stateProfileSummaries } from "@/lib/data/state-profiles";

export const metadata: Metadata = {
  title: "Air Regulatory Applicability Checker",
  description: "Screen potential NSPS, NESHAP, MACT, Title V, PSD, and GHG reporting requirements for your facility and equipment, with the rule text, citations, and clear status labels.",
  alternates: { canonical: "/applicability" },
};

const fields = ["Status", "Rule and citation", "Why, from your entries", "Rule text quoted word for word", "Link to the paragraph in the eCFR", "What to confirm", "Rule Library page"];

/** What the screener checks. Each line matches a check in src/lib/tools/applicability.ts. */
const covered: { group: string; items: { label: string; href: string }[] }[] = [
  { group: "Facility-wide", items: [
    { label: "HAP major or area source (40 CFR 63.2)", href: "/regulations/neshap" },
    { label: "Title V major source (40 CFR Part 70)", href: "/regulations/title-v" },
    { label: "PSD major stationary source (40 CFR 52.21(b)(1))", href: "/regulations/psd" },
    { label: "Greenhouse Gas Reporting Program (40 CFR 98.2)", href: "/regulations/ghg-reporting" },
  ] },
  { group: "Engines", items: [
    { label: "NSPS IIII", href: "/regulations/nsps/subpart-iiii" },
    { label: "NSPS JJJJ", href: "/regulations/nsps/subpart-jjjj" },
    { label: "NESHAP ZZZZ", href: "/regulations/neshap/subpart-zzzz" },
  ] },
  { group: "Boilers and process heaters", items: [
    { label: "NSPS Db", href: "/regulations/nsps/subpart-db" },
    { label: "NSPS Dc", href: "/regulations/nsps/subpart-dc" },
    { label: "NESHAP DDDDD", href: "/regulations/neshap/subpart-ddddd" },
    { label: "NESHAP JJJJJJ", href: "/regulations/neshap/subpart-jjjjjj" },
  ] },
  { group: "Combustion turbines", items: [
    { label: "NSPS GG", href: "/regulations/nsps/subpart-gg" },
    { label: "NSPS KKKK", href: "/regulations/nsps/subpart-kkkk" },
    { label: "NSPS KKKKa", href: "https://www.ecfr.gov/current/title-40/part-60/subpart-KKKKa" },
    { label: "NESHAP YYYY", href: "/regulations/neshap/subpart-yyyy" },
  ] },
  { group: "Storage tanks", items: [
    { label: "NSPS Kb", href: "/regulations/nsps/subpart-kb" },
    { label: "NSPS Kc", href: "/regulations/nsps/subpart-kc" },
  ] },
  { group: "Crude oil and natural gas", items: [
    { label: "NSPS KKK and LLL", href: "/regulations/nsps/subpart-kkk" },
    { label: "NSPS OOOO, OOOOa, OOOOb", href: "/regulations/nsps/subpart-oooob" },
    { label: "Emission guidelines OOOOc", href: "/regulations/nsps/subpart-ooooc" },
  ] },
  { group: "Flares", items: [{ label: "General flare requirements (40 CFR 60.18)", href: "https://www.ecfr.gov/current/title-40/section-60.18" }] },
];

export default function ApplicabilityPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Applicability Checker" }]} eyebrow="Guided screening" title="Applicability Checker" icon={<ClipboardCheck className="h-7 w-7" />} description="A screen of federal air rules for your facility and equipment. Each result shows a status, the reason, the rule text it rests on, and what information would settle the question." />
      <div className="container-page space-y-10 py-10">
        <ApplicabilityScreener states={stateProfileSummaries().map(({ slug, name, agency }) => ({ slug, name, agency }))} />

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
            <h2 className="text-lg font-bold text-ink">What the screener checks</h2>
            <dl className="mt-4 space-y-3">
              {covered.map((c) => (
                <div key={c.group}>
                  <dt className="text-xs font-bold tracking-wider text-muted uppercase">{c.group}</dt>
                  <dd className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {c.items.map((i) => i.href.startsWith("/")
                      ? <Link key={i.label} href={i.href} className="font-medium text-ink hover:text-brand-600">{i.label}</Link>
                      : <a key={i.label} href={i.href} target="_blank" rel="noopener noreferrer" className="font-medium text-ink hover:text-brand-600">{i.label}</a>)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-muted">Anything not listed is not screened, including state rules, nonattainment NSR thresholds (set in each state&apos;s rule), and other NSPS and NESHAP subparts. For a state-by-state overview of permit pathways, use the <Link href="/permit-finder" className="font-semibold text-brand-700 hover:underline">Permit Finder <ArrowRight className="inline h-3.5 w-3.5" aria-hidden="true" /></Link>.</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Every result shows</h2>
            <ul className="mt-4 flex flex-wrap gap-2">{fields.map((f) => <li key={f}><Badge tone="blue">{f}</Badge></li>)}</ul>
          </div>
        </section>
        <VerifyNotice />
        <Disclaimer variant="screening" />
      </div>
    </>
  );
}
