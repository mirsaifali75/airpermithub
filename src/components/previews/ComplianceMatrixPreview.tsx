import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /tools/compliance-matrix-builder. */
export function ComplianceMatrixPreview() {
  return (
    <ToolPreview
      name="Permit Compliance Matrix Builder"
      image="/previews/compliance-matrix-builder.webp"
      width={1400}
      height={1161}
      next="/tools/compliance-matrix-builder"
      points={[
        "Paste permit conditions and get a compliance matrix",
        "Suggested requirement types, frequencies, and citations",
        "Deadline phrases picked out of the permit text",
        "Export, or send dates to the Compliance Calendar",
      ]}
    />
  );
}
