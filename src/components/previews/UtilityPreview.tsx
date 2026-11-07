import { UTIL_BASE, collectionOf, getUtility } from "@/lib/utilities";
import { ToolPreview } from "./ToolPreview";

/** Screenshot sizes of public/previews/utility-<slug>.webp and oilgas-<slug>.webp (taken with each calculator's worked example). */
const sizes: Record<string, [number, number]> = {
  steam: [1400, 1391],
  "cooling-water": [1400, 1400],
  "chilled-water": [1400, 1400],
  "process-water": [1400, 1400],
  "compressed-air": [1400, 1400],
  nitrogen: [1400, 1364],
  "hot-oil": [1400, 1400],
  "excel-review": [1400, 1261],
  // public/previews/oilgas-<slug>.webp
  "natural-gas-properties": [1394, 1400],
  "crude-oil-pvt": [1394, 1350],
  "well-inflow": [1394, 1400],
  "gas-well-deliverability": [1394, 1400],
  "choke-calculator": [1394, 1400],
  "pipeline-flow": [1394, 1400],
  "separators-and-tanks": [1394, 1400],
  "drilling-well-control": [1394, 1400],
  "artificial-lift": [1394, 1371],
};

/** Signed-out preview for a plant utility or oil and gas calculator, or for the Excel review (slug "excel-review"). */
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
  const col = collectionOf(slug);
  return (
    <ToolPreview
      name={u.name}
      image={`/previews/${col.id === "plant" ? "utility" : "oilgas"}-${slug}.webp`}
      width={width}
      height={height}
      next={`${col.base}/${slug}`}
      points={[...u.sections.slice(0, 3).map((s) => s.title), col.id === "plant" ? "Worked examples, metric and US units, and Excel import and export" : "Worked examples, oilfield and metric units, and Excel import and export"]}
      formula={u.sections[0].formulas[0]}
    />
  );
}
