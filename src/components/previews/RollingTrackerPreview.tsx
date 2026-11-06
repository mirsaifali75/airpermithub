import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /tools/rolling-12-month-tracker. */
export function RollingTrackerPreview() {
  return (
    <ToolPreview
      name="Rolling 12-Month Limit Tracker"
      image="/previews/rolling-12-month-tracker.webp"
      width={1400}
      height={1161}
      next="/tools/rolling-12-month-tracker"
      points={[
        "Rolling sums or averages against your permit limit",
        "Headroom for every window and for next month",
        "Forecast months show when you would cross the limit",
        "Paste a column straight from Excel",
      ]}
    />
  );
}
