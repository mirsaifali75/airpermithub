import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { RegulationsExplorer, type ExplorerEntry } from "@/components/regulations/RegulationsExplorer";
import { Disclaimer } from "@/components/ui/Notices";
import { federalGuidance } from "@/lib/data/guidance";
import { federalRegulations } from "@/lib/data/regulations";
import { ruleSummaries } from "@/lib/data/ecfr";
import { ruleCitation, ruleHref, ruleName } from "@/lib/rules";
import { agencyShortName, listStateProfiles } from "@/lib/data/state-profiles";

export const metadata: Metadata = {
  title: "Regulations Explorer: Federal & State Air Regulations",
  description: "Search and browse federal and state air regulations, permit programs, guidance, and requirements: NSPS, NESHAP, MACT, Title V, NSR, PSD, GHG reporting, and all 50 state programs.",
  alternates: { canonical: "/regulations" },
};

/** Plain-language descriptions of program types; numbers live in each state's quoted sources. */
const programTypes: { type: string; title: string; description: string; href: string }[] = [
  { type: "exemption", title: "Exemptions & de minimis", description: "Sources or changes below a level the agency treats as not needing a permit, usually with conditions and records.", href: "/states" },
  { type: "registration", title: "Registrations & notices", description: "Notify-and-register options for qualifying sources, such as notices of intent or registration permits.", href: "/states" },
  { type: "pbr", title: "Permits by rule", description: "Pre-written rule authorizations a facility claims by meeting every condition of the rule.", href: "/states/texas" },
  { type: "general", title: "General permits", description: "One permit written for a class of similar sources; facilities apply for coverage under it.", href: "/states" },
  { type: "standard", title: "Standard permits", description: "Pre-approved permit terms for specific facility types (Texas uses this term).", href: "/states/texas" },
  { type: "minor-nsr", title: "Minor NSR / construction permits", description: "Case-by-case preconstruction permits for sources that are not major.", href: "/regulations/nsr" },
  { type: "state-operating", title: "State operating permits", description: "Non-Title V operating permits, including synthetic minor permits that take limits to stay below major thresholds.", href: "/states" },
  { type: "psd", title: "Prevention of Significant Deterioration", description: "Major NSR for pollutants in attainment areas.", href: "/regulations/psd" },
  { type: "nnsr", title: "Nonattainment NSR", description: "Major NSR for pollutants in nonattainment areas.", href: "/regulations/nonattainment-nsr" },
  { type: "title-v", title: "Title V operating permits", description: "Federally required operating permits for major sources and certain other sources.", href: "/regulations/title-v" },
];

export default function RegulationsPage() {
  const states = listStateProfiles();
  const entries: ExplorerEntry[] = [
    ...federalRegulations.map((r) => ({ tab: "Federal" as const, title: r.shortName === r.name ? r.name : `${r.shortName}`, citation: r.citation, description: r.name === r.shortName ? r.tagline : `${r.name}. ${r.tagline}`, href: `/regulations/${r.slug}`, keywords: (r.keySubparts ?? []).map((k) => `${k.code} ${k.title}`).join(" ") })),
    { tab: "Federal", title: "Federal Rule Library", description: "NSPS, NESHAP, and GHG reporting subparts with eCFR text on who each covers, every section, and amendment dates.", href: "/regulations/library", keywords: "subpart library ecfr rule text" },
    { tab: "Federal", title: "MACT standards", citation: "40 CFR Part 63", description: "Maximum Achievable Control Technology standards for major sources of hazardous air pollutants, organized by source category in Part 63.", href: "/regulations/neshap", keywords: "maximum achievable control technology gact area source hap" },
    { tab: "Federal", title: "State regulations", description: "Air agency rules, permit programs, forms, and guidance for all 50 states and DC.", href: "/states" },
    { tab: "Federal", title: "EPA guidance documents", description: "Program pages, emission factor references, and nonattainment designations from EPA.", href: "/regulations?tab=guidance" },
    ...ruleSummaries().map((r) => ({ tab: "Federal" as const, title: `${ruleName(r)}${r.aka.length ? ` (${r.aka[0]})` : ""}`, citation: ruleCitation(r), description: r.shortHeading, href: ruleHref(r), keywords: [r.heading, ...r.aka].join(" ") })),
    ...states.map((s) => ({
      tab: "State" as const,
      title: `${s.name} – ${agencyShortName(s.agency.name)}`,
      citation: s.regulations.slice(0, 2).map((r) => r.citation).join(" · ") || undefined,
      description: `${s.permitTypes.length} authorization programs, ${s.forms.length} official forms, ${s.guidance.length} guidance links.`,
      href: `/states/${s.slug}`,
      meta: s.verification === "verified" ? "Verified" : "Partially verified",
      keywords: `${s.agency.name} ${s.code} ${s.regulations.map((r) => `${r.citation} ${r.title}`).join(" ")} ${s.permitTypes.map((p) => p.name).join(" ")}`,
    })),
    ...programTypes.map((p) => ({
      tab: "Programs" as const,
      title: p.title,
      description: p.description,
      href: p.href,
      meta: `${states.filter((s) => s.permitTypes.some((t) => t.type === p.type)).length} state hubs list one`,
      keywords: states.flatMap((s) => s.permitTypes.filter((t) => t.type === p.type).map((t) => t.name)).join(" "),
    })),
    ...federalGuidance.map((g) => ({ tab: "Guidance" as const, title: g.title, description: g.note, href: g.url, external: true, meta: "EPA" })),
    ...states.flatMap((s) => s.guidance.map((g) => ({ tab: "Guidance" as const, title: g.name, description: `${s.name} · ${s.agency.name}`, href: g.url, external: true, meta: s.code }))),
    ...[...states]
      .sort((a, b) => b.lastReviewed.localeCompare(a.lastReviewed) || a.name.localeCompare(b.name))
      .map((s) => ({ tab: "Recent Updates" as const, title: `${s.name} hub reviewed`, description: `${agencyShortName(s.agency.name)} programs, forms, and guidance checked against agency pages${s.verification === "partial" ? " (partially verified)" : ""}.`, href: `/states/${s.slug}`, meta: s.lastReviewed })),
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Regulations" }]}
        title="Regulations Explorer"
        icon={<Landmark />}
        scene="chemical"
        description="Search and browse federal and state air regulations, guidance and requirements. Every entry links to the official text and shows how far it has been reviewed."
      />
      <div className="container-page space-y-8 py-10">
        <RegulationsExplorer entries={entries} />
        <p className="text-sm text-muted">Federal summaries describe program structure only and are marked “not yet reviewed” until an editor checks them against the eCFR. Thresholds, limits, and deadlines always come from the official text.</p>
        <Disclaimer />
      </div>
    </>
  );
}
