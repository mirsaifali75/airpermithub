import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /tools/nsr-baseline-calculator. */
export function NsrBaselinePreview() {
  return (
    <ToolPreview
      name="NSR Baseline & Project Emissions Calculator"
      image="/previews/nsr-baseline-calculator.webp"
      width={1400}
      height={1161}
      next="/tools/nsr-baseline-calculator"
      points={[
        "Highest eligible consecutive 24-month baseline across project units",
        "Actual-to-projected-actual and hybrid tests",
        "Totals by pollutant against the significance value you enter",
        "40 CFR 52.21 text quoted",
      ]}
    />
  );
}
