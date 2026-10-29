import type { Metadata } from "next";
import { RollingTracker } from "@/components/tools/RollingTracker";
import { ToolPage } from "@/components/tools/ToolPage";
import { coreTools } from "@/lib/tools/catalog";

const tool = coreTools.find((t) => t.slug === "rolling-12-month-tracker")!;

export const metadata: Metadata = {
  title: "12-Month Rolling Total Calculator for Permit Limits",
  description: tool.description,
  alternates: { canonical: tool.href },
};

export default function RollingTrackerPage() {
  return (
    <ToolPage
      path={tool.href}
      title={tool.name}
      description={tool.description}
      problem={tool.problem}
      how={[
        {
          heading: "The math",
          points: [
            "Each month's rolling value is the sum (or average) of that month and the months before it, for the window length you set.",
            "A window is flagged over the limit only when its value is above the limit you entered; equal to the limit is not over.",
            "Next-month headroom is the limit minus the most recent months that will still be in next month's window. For an average limit, it is the limit times the window length minus that sum.",
            "Months with no value are treated as missing data, and any window that contains one is flagged instead of being compared.",
          ],
        },
        {
          heading: "Using it on a real permit",
          points: [
            "Enter the limit, window, and units exactly as the permit condition states them, and use the same units for every month.",
            "Monthly values should be the figures you would put in the record: calculated emissions, metered throughput, fuel use, or hours.",
            "Set the alert level where you want time to react; many teams watch the forecast as well as the alert.",
            "Export the CSV as a working record. Your permit's recordkeeping condition decides what must be kept and for how long.",
          ],
        },
      ]}
      sources={[
        { title: "40 CFR 70.6: Title V permit content (monitoring and recordkeeping)", url: "https://www.ecfr.gov/current/title-40/section-70.6" },
        { title: "40 CFR 52.21(b)(4): potential to emit and enforceable limits", url: "https://www.ecfr.gov/current/title-40/section-52.21#p-52.21(b)(4)" },
      ]}
      related={[
        { label: "Potential to emit, explained", href: "/resources/potential-to-emit-explained" },
        { label: "Guide: tracking a rolling limit", href: "/resources/tracking-rolling-12-month-limits" },
        { label: "lb/hr to tons/yr converter", href: "/tools/lb-hr-to-tpy" },
        { label: "Compliance Calendar", href: "/compliance" },
      ]}
    >
      <RollingTracker />
    </ToolPage>
  );
}
