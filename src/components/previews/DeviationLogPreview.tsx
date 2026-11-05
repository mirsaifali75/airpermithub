import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /tools/deviation-log. */
export function DeviationLogPreview() {
  return (
    <ToolPreview
      name="Deviation & Prompt Reporting Tracker"
      image="/previews/deviation-log.webp"
      width={1400}
      height={1161}
      next="/tools/deviation-log"
      points={[
        "Log deviations with cause and corrective action",
        "Prompt report deadlines from the period your permit states",
        "What is due or overdue at a glance",
        "Entries grouped by reporting period for the semiannual report",
      ]}
    />
  );
}
