import { UTIL_BASE, getUtility } from "@/lib/utilities";
import { ToolPreview } from "./ToolPreview";

/** Screenshot sizes of public/previews/utility-<slug>.webp (taken with each calculator's worked example). */
const sizes: Record<string, [number, number]> = {
  steam: [1400, 1391],
  "cooling-water": [1400, 1400],
  "chilled-water": [1400, 1400],
  "process-water": [1400, 1400],
  "compressed-air": [1400, 1400],
  nitrogen: [1400, 1364],
  "hot-oil": [1400, 1400],
  "excel-review": [1400, 1261],
};

/** Signed-out preview for a plant utility calculator, or for the Excel review (slug "excel-review"). */
export function UtilityPreview({ slug }: { slug: string }) {
  const [width, height] = sizes[slug] ?? [1400, 1400];
  if (slug === "excel-review") {
    return (
      <ToolPreview
        name="Excel Calculation Sheet Review"
        image="/previews/utility-excel-review.webp"
        width={width}
        height={height}
        next={`${UTIL_BASE}/excel-review`}
        points={[
          "Error cells and broken references, with the usual cause",
          "Formulas that read blank cells or numbers stored as text",
          "Rules of thumb like 500, ÷ 24, and 0.00085 with their limits",
          "AirPermitHub workbooks fully recalculated and compared",
        ]}
      />
    );
  }
  const u = getUtility(slug)!;
  return (
    <ToolPreview
      name={u.name}
      image={`/previews/utility-${slug}.webp`}
      width={width}
      height={height}
      next={`${UTIL_BASE}/${slug}`}
      points={[...u.sections.slice(0, 3).map((s) => s.title), "Worked examples, metric and US units, and Excel import and export"]}
      formula={u.sections[0].formulas[0]}
    />
  );
}
