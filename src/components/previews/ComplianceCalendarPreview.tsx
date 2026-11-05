import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /compliance. */
export function ComplianceCalendarPreview() {
  return (
    <ToolPreview
      name="Compliance Calendar"
      image="/previews/compliance.webp"
      width={1400}
      height={853}
      next="/compliance"
      points={[
        "Your own testing, monitoring, reporting, and certification deadlines",
        "Repeats and reminders",
        "Month, week, day, and list views",
        "Export to Outlook, Google, or Apple Calendar",
      ]}
    />
  );
}
