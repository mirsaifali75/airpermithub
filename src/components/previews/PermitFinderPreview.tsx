import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /permit-finder. */
export function PermitFinderPreview() {
  return (
    <ToolPreview
      name="Permit Finder"
      image="/previews/permit-finder.webp"
      width={1400}
      height={853}
      next="/permit-finder"
      points={[
        "Seven guided steps: facility, location, equipment, emissions, operations, applicability, and results",
        "State and federal programs worth reviewing, each with its citation",
        "Screening pointers, not determinations",
        "Results you can export",
      ]}
    />
  );
}
