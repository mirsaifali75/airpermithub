import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { RuleCard } from "@/components/rules/RuleCard";
import { Disclaimer, VerifyNotice } from "@/components/ui/Notices";
import { ruleSummaries } from "@/lib/data/ecfr";
import { ruleCategories } from "@/lib/rules";

export const metadata: Metadata = {
  title: "Federal Rule Library: NSPS, NESHAP, and GHG Reporting Subparts",
  description: "Who each NSPS, NESHAP, and greenhouse gas reporting subpart covers, quoted from eCFR, with every section and amendment date. Quad O, Ob, and Oc, JJJJ, IIII, ZZZZ, Boiler MACT, Subpart W, and more.",
  alternates: { canonical: "/regulations/library" },
};

export default function RuleLibraryPage() {
  const rules = ruleSummaries();
  const groups = ruleCategories
    .map((c) => ({ ...c, rules: rules.filter((r) => r.category === c.key || r.also.includes(c.key)) }))
    .filter((g) => g.rules.length > 0);
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Regulations", href: "/regulations" }, { label: "Rule Library" }]}
        eyebrow="Federal rule library"
        title="NSPS, NESHAP, and GHG Reporting Subparts"
        icon={<ScrollText className="h-7 w-7" />}
        description={`${rules.length} subparts that industrial and oil and gas facilities read most. Each page quotes who the subpart covers straight from eCFR and lists every section and amendment date.`}
      />
      <div className="container-page space-y-10 py-10">
        <VerifyNotice>
          Rule text comes from eCFR and is checked weekly; changes are reviewed before they appear here. Whether a subpart applies to a facility depends on the
          full rule and the facts, so read the official text and confirm with the agency. For program background, start with{" "}
          <Link href="/regulations/nsps" className="font-semibold underline">NSPS</Link>, <Link href="/regulations/neshap" className="font-semibold underline">NESHAP</Link>, or{" "}
          <Link href="/regulations/ghg-reporting" className="font-semibold underline">GHG reporting</Link>.
        </VerifyNotice>
        <nav aria-label="Rule groups" className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <a key={g.key} href={`#${g.key}`} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-navy-800 ring-1 ring-line hover:ring-brand-300">{g.label} <span className="text-muted">{g.rules.length}</span></a>
          ))}
        </nav>
        {groups.map((g) => (
          <section key={g.key} id={g.key} className="scroll-mt-24" aria-labelledby={`${g.key}-h`}>
            <h2 id={`${g.key}-h`} className="text-xl font-bold text-ink">{g.label}</h2>
            <p className="mt-1 text-sm text-muted">{g.description}</p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.rules.map((r) => <li key={`${r.part}-${r.subpart}`}><RuleCard rule={r} /></li>)}
            </ul>
          </section>
        ))}
        <Disclaimer />
      </div>
    </>
  );
}
