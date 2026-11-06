import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /applicability. */
export function ApplicabilityPreview() {
  return (
    <ToolPreview
      name="Applicability Checker"
      image="/previews/applicability.webp"
      width={1400}
      height={1161}
      next="/applicability"
      points={[
        "Screen a facility and its equipment against NSPS, NESHAP, Title V, PSD, and GHG reporting thresholds",
        "Ozone classification sets the Title V screen (100, 50, 25, or 10 tpy)",
        "Each result shows the reason, the rule text it rests on, and what to confirm",
        "Labeled a screen, never a determination",
      ]}
    />
  );
}
