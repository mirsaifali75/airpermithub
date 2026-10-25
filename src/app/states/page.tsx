import type { Metadata } from "next";
import { MapPinned } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StateTileMap } from "@/components/states/StateTileMap";
import { Disclaimer } from "@/components/ui/Notices";
import { SectionHeading } from "@/components/ui/Section";
import { stateMapProfiles } from "@/lib/data/state-profiles";
import { stateTiles } from "@/lib/data/states";

export const metadata: Metadata = {
  title: "State Air Permitting Hubs",
  description: "State-by-state air permitting programs, agencies, forms, and guidance, each verified against the agency's own pages.",
  alternates: { canonical: "/states" },
};

export default function StatesPage() {
  const profiles = stateMapProfiles();
  const live = new Set(profiles.map((p) => p.slug));
  const sorted = [...stateTiles].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHeader
        crumbs={[{ label: "States" }]}
        eyebrow="State regulatory hubs"
        title="Air Permitting by State"
        icon={<MapPinned className="h-7 w-7" />}
        description={`${profiles.length} state hubs are live and verified against agency sources. The remaining states are in research and publish as they are checked.`}
      />
      <div className="container-page space-y-14 py-12">
        <StateTileMap profiles={profiles} />
        <section aria-labelledby="all">
          <SectionHeading id="all" title="All states" />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {sorted.map((s) => (
              <li key={s.slug}>
                <Link href={`/states/${s.slug}`} className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5 text-sm hover:border-brand-200">
                  <span className={live.has(s.slug) ? "font-semibold text-ink" : "text-slate-600"}>{s.name}</span>
                  {live.has(s.slug) ? <span className="h-2 w-2 rounded-full bg-eco-500" aria-label="Hub available" /> : <span className="text-xs text-slate-400">soon</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <Disclaimer />
      </div>
    </>
  );
}
