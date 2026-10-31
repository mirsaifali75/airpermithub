import type { Metadata } from "next";
import { HapTracker } from "@/components/tools/HapTracker";
import { ToolPage } from "@/components/tools/ToolPage";
import { coreTools } from "@/lib/tools/catalog";
import { RT } from "@/lib/tools/rule-text";

const tool = coreTools.find((t) => t.slug === "hap-major-source-tracker")!;

export const metadata: Metadata = {
  title: "HAP Major Source Tracker (10 tpy Single HAP / 25 tpy Combined)",
  description: tool.description,
  alternates: { canonical: tool.href },
};

export default function HapTrackerPage() {
  return (
    <ToolPage
      path={tool.href}
      title={tool.name}
      description={tool.description}
      problem={tool.problem}
      how={[
        {
          heading: "The calculation",
          points: [
            "Each row: uncontrolled PTE × (1 − control efficiency ÷ 100), and only when the control is enforceable. Otherwise the uncontrolled value is used.",
            "Each named HAP is summed across all units, then compared with the single-HAP threshold. All rows together are compared with the combined threshold.",
            "Rows without a HAP name count in the combined total only, and the tool says so.",
            "No emission factors are prefilled. Record the factor or method you used in each row.",
          ],
        },
        {
          heading: "What it does not decide",
          points: [
            "Which units belong to the source: 40 CFR 63.2 groups sources in a contiguous area under common control. Some NESHAP have their own aggregation rules, such as the surface site for oil and gas production.",
            "Whether a control or limit is enforceable. Use the Synthetic Minor Limit Designer to record the conditions behind it.",
            "Subpart HH sources near the line have a yearly update duty, quoted below.",
          ],
        },
      ]}
      quotes={[RT.hapMajor, RT.hapArea, RT.tvHap, RT.hapSurfaceSite, RT.hhUpdate, RT.hhLimitPte]}
      quoteSource={{ title: "the current eCFR (40 CFR 63.2, 63.760, 63.6585, 70.2)", url: "https://www.ecfr.gov/current/title-40/section-63.2" }}
      sources={[
        { title: "40 CFR 63.2: major source and area source definitions", url: "https://www.ecfr.gov/current/title-40/section-63.2" },
        { title: "40 CFR 63.760: Subpart HH applicability", url: "https://www.ecfr.gov/current/title-40/section-63.760" },
        { title: "EPA: Initial list of hazardous air pollutants, with modifications", url: "https://www.epa.gov/haps/initial-list-hazardous-air-pollutants-modifications" },
      ]}
      related={[
        { label: "Synthetic Minor Limit Designer", href: "/tools/synthetic-minor-limit-designer" },
        { label: "Applicability Checker", href: "/applicability" },
        { label: "NESHAP Subpart HH", href: "/regulations/neshap/subpart-hh" },
        { label: "Templates & Workbooks", href: "/templates" },
      ]}
    >
      <HapTracker />
    </ToolPage>
  );
}
