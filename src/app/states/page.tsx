import type { Metadata } from "next";
import { ArrowRight, MapPinned } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StateExplorer } from "@/components/states/StateExplorer";
import { VerificationBadge } from "@/components/ui/Badge";
import { Disclaimer } from "@/components/ui/Notices";
import { SectionHeading } from "@/components/ui/Section";
import { agencyShortName, listStateProfiles, stateMapProfiles } from "@/lib/data/state-profiles";

export const metadata: Metadata = {
  title: "Explore Air Permitting by State",
  description: "State-by-state air permitting programs, agencies, forms, and guidance for all 50 states and DC, each checked against the agency's own pages.",
  alternates: { canonical: "/states" },
};

export default function StatesPage() {
  const profiles = stateMapProfiles();
  const full = listStateProfiles();
  const verified = full.filter((p) => p.verification === "verified").length;
  return (
    <>
      <PageHeader
        crumbs={[{ label: "State Explorer" }]}
        title="Explore by State"
        icon={<MapPinned />}
        scene="refinery"
        description="Find state-specific air permitting information, rules and resources. Every hub links to the agency's own pages and shows how far it has been verified."
      >
        <dl className="flex flex-wrap gap-3">
          {[
            { k: "State hubs", v: `${full.length}` },
            { k: "Verified against agency pages", v: `${verified}` },
            { k: "Official forms linked", v: `${full.reduce((n, p) => n + p.forms.length, 0)}` },
            { k: "Guidance links", v: `${full.reduce((n, p) => n + p.guidance.length, 0)}` },
          ].map(({ k, v }) => (
            <div key={k} className="rounded-xl border border-line bg-white/90 px-4 py-2.5 shadow-card">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="font-display text-xl font-bold text-navy-900">{v}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>
      <div className="container-page space-y-14 py-10">
        <StateExplorer profiles={profiles} />

        <section aria-labelledby="all">
          <SectionHeading id="all" title="All states and agencies" description="Counts come straight from each state hub. Partial hubs say which parts still need checking." />
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="bg-canvas text-xs tracking-wide text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">State</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Air agency</th>
                    <th scope="col" className="px-4 py-3 font-semibold">EPA region</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Programs</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Forms</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Reviewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {full.map((p) => (
                    <tr key={p.slug} className="hover:bg-canvas/60">
                      <th scope="row" className="px-4 py-3 font-semibold text-ink">
                        <Link href={`/states/${p.slug}`} className="inline-flex items-center gap-1.5 hover:text-brand-600">{p.name} <ArrowRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" /></Link>
                      </th>
                      <td className="px-4 py-3 text-slate-700" title={p.agency.name}>{agencyShortName(p.agency.name)}</td>
                      <td className="px-4 py-3 text-slate-700">{p.epaRegion}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">{p.permitTypes.length}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">{p.forms.length}</td>
                      <td className="px-4 py-3"><VerificationBadge level={p.verification} /></td>
                      <td className="px-4 py-3 text-slate-500 tabular-nums">{p.lastReviewed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <Disclaimer />
      </div>
    </>
  );
}
