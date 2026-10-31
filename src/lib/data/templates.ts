/**
 * AirPermitHub templates and checklists. These are our own working files
 * (CSV, opens in Excel or Google Sheets). They are not government forms and
 * contain no regulatory thresholds; users fill in values from their own
 * permits, rules, and calculations.
 */

import { csvLines } from "../csv";

export interface AphTemplate {
  slug: string;
  title: string;
  kind: "template" | "checklist";
  description: string;
  tags: string[];
  columns: string[];
  rows?: string[][];
}

const step = (section: string, item: string): string[] => [section, item, "", "", "", ""];
const checklistCols = ["Section", "Item", "Status (Not started / In progress / Done / N/A)", "Owner", "Due date", "Notes / reference"];

export const aphTemplates: AphTemplate[] = [
  {
    slug: "facility-equipment-inventory",
    title: "Facility Equipment Inventory",
    kind: "template",
    description: "One row per emission unit, with the identifiers and design data permit applications and calculations ask for.",
    tags: ["Inventory", "All industries"],
    columns: ["Unit ID", "Description", "Equipment type", "Make / model", "Serial number", "Rated capacity", "Capacity units", "Fuel / material", "Construction date", "Last modification date", "Control device", "Emission point ID", "Authorization", "Notes"],
  },
  {
    slug: "engine-inventory",
    title: "Engine Inventory",
    kind: "template",
    description: "Stationary engine data used for NSPS/NESHAP screening and emission calculations.",
    tags: ["Engines", "Oil & Gas", "Midstream"],
    columns: ["Unit ID", "Make", "Model", "Serial number", "Ignition (SI / CI)", "Stroke (2 / 4)", "Burn (rich / lean)", "Rated hp", "Rated rpm", "Manufacture date", "Order date", "Install date", "Fuel", "Emergency / non-emergency", "Catalyst / control", "Emission factor source", "Notes"],
  },
  {
    slug: "tank-inventory",
    title: "Tank Inventory",
    kind: "template",
    description: "Storage vessel data for throughput, vapor pressure, and control tracking.",
    tags: ["Storage Tanks", "Oil & Gas"],
    columns: ["Tank ID", "Service (crude / condensate / produced water / other)", "Capacity", "Capacity units", "Roof type", "Construction date", "Annual throughput", "Throughput units", "Liquid vapor pressure", "Vapor pressure basis", "Control (VRU / combustor / none)", "Control efficiency claimed", "Sample / analysis date", "Notes"],
  },
  {
    slug: "emission-calculation-workbook",
    title: "Emission Calculation Workbook",
    kind: "template",
    description: "A calculation log that records every input, factor, and source, matching the AirPermitHub calculator export.",
    tags: ["Calculations", "PTE"],
    columns: ["Source ID", "Method", "Pollutant", "Activity / capacity", "Activity units", "Emission factor", "Factor units", "Factor reference (document, section, table)", "Factor revision date", "Operating hours", "Control efficiency (%)", "lb/hr", "tons/yr", "Prepared by", "Checked by", "Date"],
  },
  {
    slug: "permit-condition-tracker",
    title: "Permit Condition Tracker",
    kind: "template",
    description: "Turn each permit condition into an owned, dated obligation with evidence.",
    tags: ["Compliance", "Title V"],
    columns: ["Permit number", "Condition number", "Requirement (paste from permit)", "Type (limit / monitoring / testing / recordkeeping / reporting)", "Applies to unit(s)", "Frequency", "Owner", "Next due date", "Evidence / record location", "Status", "Notes"],
  },
  {
    slug: "compliance-calendar",
    title: "Compliance Calendar",
    kind: "template",
    description: "Dated tasks across facilities, ready to sort, filter, or import into a calendar.",
    tags: ["Compliance", "Deadlines"],
    columns: ["Facility", "Task", "Category", "Source (permit condition or rule citation)", "Due date", "Reminder date", "Owner", "Status", "Completed date", "Evidence"],
  },
  {
    slug: "deviation-log",
    title: "Deviation Log",
    kind: "template",
    description: "Record deviations, causes, corrective actions, and reporting status.",
    tags: ["Compliance", "Reporting"],
    columns: ["Facility", "Unit ID", "Permit condition", "Start date/time", "End date/time", "Description", "Cause", "Corrective action", "Excess emissions estimate", "Reported to agency? (Y/N)", "Report date", "Report reference"],
  },
  {
    slug: "flare-tracking",
    title: "Flare Tracking Log",
    kind: "template",
    description: "Track flaring events, volumes, and pilot monitoring.",
    tags: ["Flares", "Oil & Gas"],
    columns: ["Flare ID", "Date", "Start time", "End time", "Event type (routine / maintenance / emergency)", "Gas volume", "Volume units", "Volume basis (metered / estimated)", "Pilot flame present (Y/N)", "Visible emissions observed (Y/N)", "Notes"],
  },
  {
    slug: "regulatory-applicability-matrix",
    title: "Regulatory Applicability Matrix",
    kind: "template",
    description: "Document, unit by unit, why each candidate rule does or does not apply, with citations.",
    tags: ["Applicability", "NSPS", "NESHAP"],
    columns: ["Unit ID", "Candidate rule", "Citation", "Applicability criteria reviewed", "Determination (applies / does not apply / more info needed)", "Basis (dates, capacity, exemptions)", "Reviewer", "Review date"],
  },
  {
    slug: "air-permit-checklist",
    title: "Air Permit Application Checklist",
    kind: "checklist",
    description: "A working checklist from jurisdiction through submittal. Pair it with the agency's own application instructions.",
    tags: ["Permitting", "All states"],
    columns: checklistCols,
    rows: [
      step("Jurisdiction", "Confirm the state or local air agency with jurisdiction"),
      step("Jurisdiction", "Confirm attainment status of the county for each criteria pollutant"),
      step("Jurisdiction", "Search for existing authorizations at the site"),
      step("Inventory", "Complete the equipment inventory for every emission unit"),
      step("Inventory", "Collect manufacturer data, gas/liquid analyses, and throughput"),
      step("Calculations", "Calculate potential to emit for each unit and pollutant"),
      step("Calculations", "Cite every emission factor (document, section, revision date)"),
      step("Calculations", "Document any enforceable limits used in PTE"),
      step("Applicability", "Screen state authorization options against the rule text"),
      step("Applicability", "Screen NSPS / NESHAP subparts unit by unit"),
      step("Applicability", "Compare PTE with major source and major modification criteria"),
      step("Application", "Download the current official forms from the agency"),
      step("Application", "Prepare plot plan, process flow diagram, and process description"),
      step("Application", "Prepare emission calculations appendix"),
      step("Application", "Confirm fees and payment method"),
      step("Application", "Confirm public notice requirements, if any"),
      step("Submittal", "Responsible official signature and certification"),
      step("Submittal", "Submit through the agency's portal or required method"),
      step("Submittal", "Record submittal date and tracking number"),
    ],
  },
  {
    slug: "inspection-checklist",
    title: "Facility Inspection Readiness Checklist",
    kind: "checklist",
    description: "Prepare records and the site for an agency inspection.",
    tags: ["Compliance", "Inspections"],
    columns: checklistCols,
    rows: [
      step("Permits", "Current authorizations on site and accessible"),
      step("Permits", "Equipment on site matches the authorized inventory"),
      step("Records", "Monitoring records complete for the review period"),
      step("Records", "Testing reports and notifications on file"),
      step("Records", "Deviation log reviewed and reports submitted"),
      step("Records", "Throughput and operating-hour records up to date"),
      step("Site", "Control devices operating as required"),
      step("Site", "Signage, unit IDs, and sampling ports in place"),
      step("Site", "LDAR program records, if applicable"),
      step("People", "Site contact and environmental lead identified"),
    ],
  },
  {
    slug: "new-equipment-checklist",
    title: "New Equipment Change Checklist",
    kind: "checklist",
    description: "Run before installing or modifying equipment so permitting is not an afterthought.",
    tags: ["Management of change", "Permitting"],
    columns: checklistCols,
    rows: [
      step("Scope", "Describe the change and affected units"),
      step("Scope", "Identify construction / modification dates"),
      step("Emissions", "Calculate emission changes for each pollutant"),
      step("Emissions", "Check whether project emissions trigger major NSR review"),
      step("Authorization", "Identify the authorization path (amend, register, new permit)"),
      step("Authorization", "Confirm whether authorization is needed before construction"),
      step("Federal rules", "Screen NSPS / NESHAP for the new or modified units"),
      step("Records", "Update equipment inventory and calculation workbook"),
      step("Records", "Add new obligations to the compliance calendar"),
    ],
  },
];

export function getTemplate(slug: string) {
  return aphTemplates.find((t) => t.slug === slug);
}

export function templateCsv(t: AphTemplate) {
  const lines = [
    [`${t.title} (AirPermitHub Template, not a government form)`],
    [],
    t.columns,
    ...(t.rows ?? [t.columns.map(() => "")]),
  ];
  return csvLines(lines);
}
