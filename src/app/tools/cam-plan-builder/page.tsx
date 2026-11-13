import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import { CamPlanBuilder } from "@/components/tools/CamPlanBuilder";
import { ToolGate } from "@/components/auth/ToolGate";
import { CamPlanPreview } from "@/components/previews";
import { ToolPage } from "@/components/tools/ToolPage";
import { coreTools } from "@/lib/tools/catalog";
import { RT } from "@/lib/tools/rule-text";

const tool = coreTools.find((t) => t.slug === "cam-plan-builder")!;

export const metadata: Metadata = withSocial({
  title: "CAM Plan Builder (40 CFR Part 64 Applicability and Monitoring Plan)",
  description: tool.description,
  alternates: { canonical: tool.href },
});

export default function CamPage() {
  return (
    <ToolPage
      path={tool.href}
      title={tool.name}
      description={tool.description}
      problem={tool.problem}
      how={[
        {
          heading: "The 64.2(a) screen",
          points: [
            "Part 64 reaches pollutant-specific emissions units at a major source required to obtain a Part 70 or 71 permit.",
            "A unit meets the criteria when it is subject to a non-exempt emission limitation or standard, uses a control device to comply, and has pre-control PTE at or above 100 percent of the major source amount.",
            "Pre-control PTE leaves out the control device's reduction. The major source amount is the Part 70 threshold for that pollutant in your area.",
            "You answer each question; anything not sure stays “more information needed.” The tool does not decide whether a limit is exempt.",
          ],
        },
        {
          heading: "The plan record",
          points: [
            "For a unit that meets the criteria, record what 64.4(a) asks for: indicators, ranges, and performance criteria, plus how excursions are defined and handled.",
            "Each field shows the Part 64 text it answers.",
            "Other 64.2(b) exemptions exist (Acid Rain, emissions trading, certain caps, municipal backup utility units). Read 64.2(b) in full.",
            "Export the CSV or print for the permit application. The permitting authority approves the monitoring.",
          ],
        },
      ]}
      quotes={[RT.camApplies, RT.camLimit, RT.camControl, RT.camPrecontrol, RT.camPost1990, RT.camContinuous, RT.camIndicators, RT.camRanges, RT.camSubmit, RT.camExcursion, RT.camExceedance]}
      quoteSource={{ title: "40 CFR Part 64 (current eCFR)", url: "https://www.ecfr.gov/current/title-40/part-64" }}
      sources={[
        { title: "40 CFR Part 64: Compliance Assurance Monitoring", url: "https://www.ecfr.gov/current/title-40/part-64" },
        { title: "EPA: Compliance Assurance Monitoring", url: "https://www.epa.gov/air-emissions-monitoring-knowledge-base/compliance-assurance-monitoring" },
      ]}
      related={[
        { label: "Synthetic Minor Limit Designer", href: "/tools/synthetic-minor-limit-designer" },
        { label: "Permit Compliance Matrix Builder", href: "/tools/compliance-matrix-builder" },
        { label: "Deviation & Prompt Reporting Tracker", href: "/tools/deviation-log" },
        { label: "Templates & Workbooks", href: "/templates" },
      ]}
    >
      <ToolGate name={tool.name} next="/tools/cam-plan-builder" preview={<CamPlanPreview />}>
        <CamPlanBuilder />
      </ToolGate>
    </ToolPage>
  );
}
