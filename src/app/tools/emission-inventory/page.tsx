import type { Metadata } from "next";
import { EmissionInventory } from "@/components/tools/EmissionInventory";
import { ToolGate } from "@/components/auth/ToolGate";
import { ToolPage } from "@/components/tools/ToolPage";
import { coreTools } from "@/lib/tools/catalog";

const tool = coreTools.find((t) => t.slug === "emission-inventory")!;

export const metadata: Metadata = {
  title: "Emission Inventory Builder (Annual Actual Emissions Calculator)",
  description: tool.description,
  alternates: { canonical: tool.href },
};

export default function EmissionInventoryPage() {
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
            "Actual emissions (tpy) = annual activity × emission factor (lb per unit of activity) × (1 − control ÷ 100) ÷ 2,000 lb/ton.",
            "Control is taken only when you mark that it operated as the factor or test assumes.",
            "Where you have CEMS data, a stack test rate, or a mass balance, enter that annual value instead; the method you name goes with it to the export.",
            "No emission factors are built in. Name the source of every factor you use.",
          ],
        },
        {
          heading: "What it is not",
          points: [
            "Not a state form. Each state sets which pollutants, units, and thresholds its inventory covers and how it is submitted.",
            "Not potential to emit: this is actual emissions for one year. For PTE and limits, use the Synthetic Minor Limit Designer.",
            "Entries stay in this browser. Export the CSV to keep a record with your inventory files.",
          ],
        },
      ]}
      sources={[
        { title: "EPA: AP-42, Compilation of Air Emissions Factors", url: "https://www.epa.gov/air-emissions-factors-and-quantification/ap-42-compilation-air-emissions-factors-stationary-sources" },
        { title: "EPA: Air Emissions Inventories", url: "https://www.epa.gov/air-emissions-inventories" },
      ]}
      related={[
        { label: "Emission Calculators", href: "/calculators" },
        { label: "Synthetic Minor Limit Designer", href: "/tools/synthetic-minor-limit-designer" },
        { label: "Rolling 12-Month Limit Tracker", href: "/tools/rolling-12-month-tracker" },
        { label: "Templates & Workbooks", href: "/templates" },
      ]}
    >
      <ToolGate name={tool.name} next="/tools/emission-inventory">
        <EmissionInventory />
      </ToolGate>
    </ToolPage>
  );
}
