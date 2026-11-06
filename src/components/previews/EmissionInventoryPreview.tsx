import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /tools/emission-inventory. */
export function EmissionInventoryPreview() {
  return (
    <ToolPreview
      name="Emission Inventory Builder"
      image="/previews/emission-inventory.webp"
      width={1400}
      height={1161}
      next="/tools/emission-inventory"
      points={[
        "Annual emissions from activity, your emission factor, and control",
        "CEMS and stack test results as alternative inputs",
        "Totals by pollutant and HAP by name",
        "Every line's calculation in the export",
      ]}
    />
  );
}
