import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /tools/cam-plan-builder. */
export function CamPlanPreview() {
  return (
    <ToolPreview
      name="CAM Plan Builder"
      image="/previews/cam-plan-builder.webp"
      width={1400}
      height={1161}
      next="/tools/cam-plan-builder"
      points={[
        "Screen each unit and pollutant against the three 40 CFR 64.2(a) criteria",
        "Record indicators, ranges, and performance criteria",
        "Plan the excursion response",
        "Part 64 text quoted beside each item",
      ]}
    />
  );
}
