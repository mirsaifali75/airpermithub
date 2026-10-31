import type { Metadata } from "next";
import { SyntheticMinorDesigner } from "@/components/tools/SyntheticMinorDesigner";
import { ToolPage } from "@/components/tools/ToolPage";
import { coreTools } from "@/lib/tools/catalog";
import { EPA_PTE_1989, EPA_PTE_1995, RT } from "@/lib/tools/rule-text";

const tool = coreTools.find((t) => t.slug === "synthetic-minor-limit-designer")!;

export const metadata: Metadata = {
  title: "Synthetic Minor Limit Designer (PTE Limits for Title V, PSD, and HAP)",
  description: tool.description,
  alternates: { canonical: tool.href },
};

export default function SyntheticMinorPage() {
  return (
    <ToolPage
      path={tool.href}
      title={tool.name}
      description={tool.description}
      problem={tool.problem}
      how={[
        {
          heading: "Limited potential to emit, row by row",
          points: [
            "Start from potential to emit at full design capacity and 8,760 hours per year, before controls, using your own emission factors and method.",
            "Control: PTE × (1 − control efficiency ÷ 100), only when the control will be enforceable.",
            "Hours limit: × (hours ÷ 8,760). Throughput or fuel limit: × (limit ÷ throughput at full capacity, same units). Emission cap: the lower of the cap and the value before it.",
            "Every row shows its arithmetic. No emission factors or thresholds are prefilled in the rows.",
          ],
        },
        {
          heading: "Facility comparison",
          points: [
            "Each criteria pollutant is summed across units. Each HAP is summed across units by name, then compared with the single-HAP threshold; all HAP together with the combined threshold.",
            "Thresholds come from the rule text quoted below: Title V (40 CFR 70.2), PSD (40 CFR 52.21(b)(1)(i)), and HAP major source (40 CFR 63.2). A total equal to a threshold counts as at or above it.",
            "“Limits needed” marks pollutants that are over a threshold without the limits, so the limits are what make the source a synthetic minor for that program.",
            "Your state may have its own synthetic minor program, lower thresholds, or required permit language. This is a design screen, not a determination.",
          ],
        },
      ]}
      quotes={[RT.tvMajor100, RT.tvOzone, RT.tvOtr, RT.tvCoSerious, RT.tvPm10Serious, RT.tvHap, RT.ptePart70, RT.psdListed, RT.psd250, RT.hapMajor, RT.hapArea]}
      quoteSource={{ title: "the current eCFR (40 CFR 70.2, 52.21, 63.2)", url: "https://www.ecfr.gov/current/title-40/section-70.2" }}
      sources={[
        { title: "40 CFR 70.2: Part 70 definitions (major source, PTE)", url: "https://www.ecfr.gov/current/title-40/section-70.2" },
        { title: "40 CFR 52.21: PSD major stationary source", url: "https://www.ecfr.gov/current/title-40/section-52.21" },
        { title: "40 CFR 63.2: major source and area source", url: "https://www.ecfr.gov/current/title-40/section-63.2" },
        { title: EPA_PTE_1989.title, url: EPA_PTE_1989.url },
        { title: EPA_PTE_1995.title, url: EPA_PTE_1995.url },
      ]}
      related={[
        { label: "Guide: writing a synthetic minor limit that holds up", href: "/resources/writing-a-synthetic-minor-limit" },
        { label: "Rolling 12-Month Limit Tracker", href: "/tools/rolling-12-month-tracker" },
        { label: "HAP Major Source Tracker", href: "/tools/hap-major-source-tracker" },
        { label: "Applicability Checker", href: "/applicability" },
        { label: "Templates & Workbooks", href: "/templates" },
      ]}
    >
      <SyntheticMinorDesigner />
    </ToolPage>
  );
}
