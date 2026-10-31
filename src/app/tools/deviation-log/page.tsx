import type { Metadata } from "next";
import { DeviationLog } from "@/components/tools/DeviationLog";
import { ToolPage } from "@/components/tools/ToolPage";
import { coreTools } from "@/lib/tools/catalog";
import { RT } from "@/lib/tools/rule-text";

const tool = coreTools.find((t) => t.slug === "deviation-log")!;

export const metadata: Metadata = {
  title: "Deviation & Prompt Reporting Tracker (Title V Deviation Log)",
  description: tool.description,
  alternates: { canonical: tool.href },
};

export default function DeviationLogPage() {
  return (
    <ToolPage
      path={tool.href}
      title={tool.name}
      description={tool.description}
      problem={tool.problem}
      how={[
        {
          heading: "Why log deviations as they happen",
          points: [
            "Title V permits require prompt reporting of deviations, with the probable cause and the corrective actions or preventive measures taken (40 CFR 70.6(a)(3)(iii)(B)). The permit defines “prompt.”",
            "Periodic monitoring reports must clearly identify every deviation in the period (40 CFR 70.6(a)(3)(iii)(A)), and the annual compliance certification draws on the same record (40 CFR 70.6(c)(5)).",
            "Details are easiest to capture the day they happen: times, the condition affected, what operators saw, and what was done.",
          ],
        },
        {
          heading: "Using the log",
          points: [
            "Set the report cycle and the month a period starts so entries group the way your permit's reports do.",
            "Enter each prompt reporting deadline as your permit or state rule states it (hours or calendar days, from discovery or from the start), with where it is written. Nothing is prefilled.",
            "Pick the deadline when you log a deviation. The tool shows the due date with its arithmetic, lists reports due or overdue, and grades each sent report as on time or late.",
            "Record the prompt report date when one is sent, so the periodic report can reference it.",
            "Export the CSV or print a period when drafting the report. The log is an AirPermitHub template, not an agency form; use your agency's report forms where required.",
            "Entries stay in this browser. Export regularly and keep the file with your compliance records.",
          ],
        },
      ]}
      quotes={[RT.tvPrompt, RT.tvSemiannual, RT.tvCertDeviations]}
      quoteSource={{ title: "40 CFR 70.6 (current eCFR)", url: "https://www.ecfr.gov/current/title-40/section-70.6" }}
      sources={[
        { title: "40 CFR 70.6: Title V permit content (monitoring, reporting, certification)", url: "https://www.ecfr.gov/current/title-40/section-70.6" },
        { title: "EPA: Title V Operating Permits", url: "https://www.epa.gov/title-v-operating-permits" },
      ]}
      related={[
        { label: "Guide: deviation reporting", href: "/resources/deviation-reporting-what-to-capture" },
        { label: "Permit Compliance Matrix Builder", href: "/tools/compliance-matrix-builder" },
        { label: "Title V operating permits: what they require", href: "/resources/title-v-basics" },
        { label: "Compliance Calendar", href: "/compliance" },
      ]}
    >
      <DeviationLog />
    </ToolPage>
  );
}
