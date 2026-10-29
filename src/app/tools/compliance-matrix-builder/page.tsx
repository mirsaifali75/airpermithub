import type { Metadata } from "next";
import { MatrixBuilder } from "@/components/tools/MatrixBuilder";
import { ToolPage } from "@/components/tools/ToolPage";
import { coreTools } from "@/lib/tools/catalog";

const tool = coreTools.find((t) => t.slug === "compliance-matrix-builder")!;

export const metadata: Metadata = {
  title: "Title V Compliance Matrix Builder (Permit Conditions to Tasks)",
  description: tool.description,
  alternates: { canonical: tool.href },
};

export default function MatrixBuilderPage() {
  return (
    <ToolPage
      path={tool.href}
      title={tool.name}
      description={tool.description}
      problem={tool.problem}
      how={[
        {
          heading: "What the builder does",
          points: [
            "Splits pasted text at condition numbers such as 1., 3.1.2, A.1, (a), or Condition 5, and joins wrapped lines back together.",
            "Suggests requirement types (limit, monitoring, testing, recordkeeping, reporting, certification, LDAR, inspection, work practice) from the words in each condition.",
            "Pulls out citations (40 CFR, §, Subpart, 30 TAC, NMAC) and deadline phrases such as “within 30 days after” so you can see them at a glance.",
            "Short lines without “shall” or “must” are treated as section headings. You can switch any row back.",
          ],
        },
        {
          heading: "Making it a working compliance tool",
          points: [
            "Confirm the type and frequency on every row; the suggestions are keyword matches, not a reading of the permit.",
            "Give every row an owner and the record that proves it was done. That is what an inspector or auditor asks for.",
            "Set the next due date from the permit or the underlying rule, then add dated rows to the Compliance Calendar. Monthly, quarterly, semiannual, and annual items repeat for 12 months.",
            "Export the CSV to keep the matrix with the permit file and update it at every permit revision.",
          ],
        },
      ]}
      sources={[
        { title: "40 CFR 70.6: Title V permit content", url: "https://www.ecfr.gov/current/title-40/section-70.6" },
        { title: "EPA: Title V Operating Permits", url: "https://www.epa.gov/title-v-operating-permits" },
      ]}
      related={[
        { label: "Guide: building a compliance matrix", href: "/resources/building-a-title-v-compliance-matrix" },
        { label: "Title V operating permits: what they require", href: "/resources/title-v-basics" },
        { label: "Compliance Calendar", href: "/compliance" },
        { label: "Title V Deviation Log", href: "/tools/deviation-log" },
      ]}
    >
      <MatrixBuilder />
    </ToolPage>
  );
}
