import type { Metadata } from "next";
import { NsrBaseline } from "@/components/tools/NsrBaseline";
import { ToolPage } from "@/components/tools/ToolPage";
import { coreTools } from "@/lib/tools/catalog";
import { nsrRuleText } from "@/lib/tools/nsr";

const tool = coreTools.find((t) => t.slug === "nsr-baseline-calculator")!;

export const metadata: Metadata = {
  title: "NSR Baseline Actual Emissions Calculator (24-Month Lookback)",
  description: tool.description,
  alternates: { canonical: tool.href },
};

export default function NsrBaselinePage() {
  return (
    <ToolPage
      path={tool.href}
      title={tool.name}
      description={tool.description}
      problem={tool.problem}
      how={[
        {
          heading: "Baseline actual emissions",
          points: [
            "Every consecutive window of the length you set is checked. A window counts only if it sits inside the lookback before the project date and every unit has data for every month in it.",
            "Each unit's baseline is the window's total tons × 12 ÷ window length, the average annual rate.",
            "All units in the project share one window, and the window with the highest combined rate is shown first. You may pick a different eligible window; the top five are listed.",
            "Values must already be adjusted the way the rule requires. The tool does not remove non-compliant emissions for you.",
          ],
        },
        {
          heading: "Step 1: the project emissions increase",
          points: [
            "For each existing unit: projected actual emissions minus baseline, minus emissions the unit could have accommodated during the baseline period that are unrelated to the project.",
            "Electing potential to emit in place of projected actual emissions removes that exclusion.",
            "New units have a baseline of zero, so a project with new and existing units is summed the same way (the hybrid test).",
            "The comparison uses the significance value you enter. A result at or above it is only Step 1; netting (Step 2) decides whether the project is a major modification.",
          ],
        },
      ]}
      quotes={[...nsrRuleText.quotes]}
      quoteSource={nsrRuleText.source}
      sources={[nsrRuleText.current, { title: "EPA: New Source Review (NSR) Permitting", url: "https://www.epa.gov/nsr" }]}
      related={[
        { label: "Guide: choosing an NSR baseline period", href: "/resources/choosing-an-nsr-baseline-period" },
        { label: "PSD vs. Nonattainment NSR vs. minor NSR", href: "/resources/psd-vs-minor-nsr" },
        { label: "PSD overview", href: "/regulations/psd" },
        { label: "Rolling 12-Month Limit Tracker", href: "/tools/rolling-12-month-tracker" },
      ]}
    >
      <NsrBaseline />
    </ToolPage>
  );
}
