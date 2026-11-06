import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /tools/hap-major-source-tracker. */
export function HapTrackerPreview() {
  return (
    <ToolPreview
      name="HAP Major Source Tracker"
      image="/previews/hap-major-source-tracker.webp"
      width={1400}
      height={1161}
      next="/tools/hap-major-source-tracker"
      points={[
        "Each HAP summed across units by name and compared with 10 tpy",
        "All HAP together compared with 25 tpy",
        "Controls count only when marked enforceable",
        "40 CFR 63.2 text quoted beside the result",
      ]}
    />
  );
}
