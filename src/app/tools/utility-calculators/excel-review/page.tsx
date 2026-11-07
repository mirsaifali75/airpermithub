import type { Metadata } from "next";
import { ToolGate } from "@/components/auth/ToolGate";
import { UtilityPreview } from "@/components/previews";
import { ToolPage } from "@/components/tools/ToolPage";
import { SheetReview } from "@/components/utilities/SheetReview";
import { UTIL_BASE, utilities } from "@/lib/utilities";
import { REF } from "@/lib/utilities/calcs/refs";
import { utilityTools } from "@/lib/tools/catalog";

const tool = utilityTools.find((t) => t.slug === "excel-review")!;
const path = `${UTIL_BASE}/excel-review`;

export const metadata: Metadata = {
  title: "Excel Calculation Sheet Review: Check Engineering Spreadsheet Formulas",
  description: tool.description,
  alternates: { canonical: path },
};

export default function ExcelReviewPage() {
  return (
    <ToolPage
      path={path}
      title={tool.name}
      description={tool.description}
      problem={tool.problem}
      crumbs={[{ label: "Tools", href: "/tools" }, { label: "Plant Utility Calculators", href: UTIL_BASE }, { label: "Excel Review" }]}
      how={[
        {
          heading: "What it checks",
          points: [
            "Error values (#DIV/0!, #REF!, #N/A, #VALUE!, #NAME?, #NUM!) and what usually causes each.",
            "Formulas that point at deleted cells, and formulas that read blank cells (a blank counts as zero with no warning).",
            "Numbers stored as text, which formulas can skip.",
            "Constants typed into formulas, such as 500, ÷ 24, 4.18, 8.33, 2257, 22.4, or 14.7, with what each assumes and when it stops being valid.",
          ],
        },
        {
          heading: "AirPermitHub workbooks",
          points: [
            "If the file is the AirPermitHub utility workbook (or an export from a calculator), the site reloads your inputs, recalculates every section, and lists any result that differs from the file by more than 0.5 %.",
            "You can then load those inputs into the web calculators with one click.",
            "The review reads the values Excel saved. Open and save the file in Excel first so every formula has a current result.",
          ],
        },
      ]}
      sources={[REF.if97, REF.nist811, REF.doeSteam]}
      related={[...utilities.map((u) => ({ label: u.name, href: `${UTIL_BASE}/${u.slug}` })), { label: "Templates & Workbooks", href: "/templates" }]}
    >
      <ToolGate name={tool.name} next={path} preview={<UtilityPreview slug="excel-review" />}>
        <SheetReview />
      </ToolGate>
    </ToolPage>
  );
}
