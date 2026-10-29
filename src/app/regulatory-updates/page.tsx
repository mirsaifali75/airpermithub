import type { Metadata } from "next";
import { ExternalLink, Newspaper } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { UpdatesBrowser } from "@/components/tools/UpdatesBrowser";
import { Disclaimer, VerifyNotice } from "@/components/ui/Notices";
import { ShareLinks } from "@/components/ui/ShareLinks";
import { fetchAirRuleUpdates, updateGroups } from "@/lib/fedreg";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "EPA Air Rule Tracker: New Federal Register Rules and Comment Deadlines",
  description: "The latest EPA final and proposed rules for NSPS, NESHAP, SIPs, Title V, NSR, NAAQS, and GHG reporting, from the Federal Register, with comment deadlines.",
  alternates: { canonical: "/regulatory-updates" },
};

export default async function RegulatoryUpdatesPage() {
  const { docs, fetchedAt, failed } = await fetchAirRuleUpdates();
  const updated = new Date(fetchedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Tools", href: "/tools" }, { label: "Federal Air Rule Tracker" }]}
        eyebrow="Federal Register"
        title="Federal Air Rule Tracker"
        icon={<Newspaper />}
        description="EPA final and proposed rules that amend the air program parts of 40 CFR, newest first, with comment deadlines. Filter by program, state, subpart, or docket."
      />
      <div className="container-page space-y-6 py-10">
        <VerifyNotice>
          Pulled automatically from the Federal Register API. Titles, dates, and abstracts appear as published; AirPermitHub has not reviewed them, and our regulation summaries change only after editorial review. The Federal Register document is the official source. List updated {updated} UTC.
        </VerifyNotice>
        {docs.length > 0 ? (
          <UpdatesBrowser docs={docs} />
        ) : (
          <section className="rounded-2xl border border-dashed border-line bg-white p-6 text-center">
            <h2 className="font-bold text-ink">The Federal Register feed is unavailable right now</h2>
            <p className="mt-1 text-sm text-muted">The list refreshes every few hours. Meanwhile, search the Federal Register directly:</p>
          </section>
        )}
        {failed.length > 0 && docs.length > 0 && <p className="text-xs text-muted">Some parts could not be loaded this time (40 CFR {failed.join(", ")}). They will be retried at the next refresh.</p>}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="fr-links">
          <h2 id="fr-links" className="font-bold text-ink">Search the Federal Register by program</h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {updateGroups.map((g) => (
              <li key={g.key}>
                <a href={`https://www.federalregister.gov/documents/search?conditions%5Bagencies%5D%5B%5D=environmental-protection-agency&conditions%5Bcfr%5D%5Btitle%5D=40&conditions%5Bcfr%5D%5Bpart%5D=${g.parts[0]}&order=newest`} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 font-medium text-brand-700 hover:underline">
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{g.long.replace(/ \(40 CFR.*$/, "")}: 40 CFR {g.parts[0]}
                </a>
              </li>
            ))}
          </ul>
        </section>
        <ShareLinks path="/regulatory-updates" title="Federal Air Rule Tracker" />
        <Disclaimer />
      </div>
    </>
  );
}
