import type { ComplianceStatus } from "./types";

/**
 * DEMO compliance data for the dashboard preview. Facilities and tasks are
 * fictional. Dates are offsets from "today" so the preview always looks live.
 */

export const complianceCategories = [
  "Testing", "Inspection", "Reporting", "Certification", "Permit Renewal", "Monitoring", "Recordkeeping", "LDAR", "Emission Inventory", "Deviation Reporting",
] as const;

export interface DemoTask {
  id: string;
  title: string;
  facility: string;
  category: (typeof complianceCategories)[number];
  dueOffsetDays: number;
  status: ComplianceStatus;
}

export const demoTasks: DemoTask[] = [
  { id: "t1", title: "Quarterly LDAR survey", facility: "Sample Ranch Tank Battery", category: "LDAR", dueOffsetDays: -3, status: "overdue" },
  { id: "t2", title: "Engine performance test", facility: "Example Compressor Station", category: "Testing", dueOffsetDays: 4, status: "due-soon" },
  { id: "t3", title: "Semiannual monitoring report", facility: "Placeholder Gas Plant", category: "Reporting", dueOffsetDays: 9, status: "due-soon" },
  { id: "t4", title: "Monthly flare inspection", facility: "Sample Ranch Tank Battery", category: "Inspection", dueOffsetDays: 12, status: "on-track" },
  { id: "t5", title: "Annual compliance certification", facility: "Placeholder Gas Plant", category: "Certification", dueOffsetDays: 18, status: "on-track" },
  { id: "t6", title: "Emissions inventory submittal", facility: "Example Compressor Station", category: "Emission Inventory", dueOffsetDays: 25, status: "not-evaluated" },
  { id: "t7", title: "Tank throughput records", facility: "Demo SWD Facility", category: "Recordkeeping", dueOffsetDays: -8, status: "completed" },
];

export const demoFacilities = [
  { name: "Sample Ranch Tank Battery", location: "TX", permitStatus: "Authorized (demo)", status: "overdue" as ComplianceStatus, openTasks: 3 },
  { name: "Example Compressor Station", location: "NM", permitStatus: "Authorized (demo)", status: "due-soon" as ComplianceStatus, openTasks: 2 },
  { name: "Placeholder Gas Plant", location: "TX", permitStatus: "Title V (demo)", status: "on-track" as ComplianceStatus, openTasks: 2 },
  { name: "Demo SWD Facility", location: "NM", permitStatus: "Not evaluated", status: "not-evaluated" as ComplianceStatus, openTasks: 0 },
];
