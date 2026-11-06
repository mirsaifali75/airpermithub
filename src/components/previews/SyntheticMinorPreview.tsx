import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /tools/synthetic-minor-limit-designer. */
export function SyntheticMinorPreview() {
  return (
    <ToolPreview
      name="Synthetic Minor Limit Designer"
      image="/previews/synthetic-minor-limit-designer.webp"
      width={1400}
      height={1161}
      next="/tools/synthetic-minor-limit-designer"
      points={[
        "Limited PTE per unit from hours, throughput, and enforceable control",
        "Facility totals by pollutant against the quoted Title V and PSD thresholds",
        "Every step of the arithmetic shown",
        "CSV export and print",
      ]}
    />
  );
}
