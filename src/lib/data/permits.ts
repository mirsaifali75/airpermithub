import type { DocumentOrigin } from "./types";

/**
 * DEMO permit records. Facility names, companies, and permit numbers are
 * fictional and exist only to design the permit library interface.
 */
export interface PermitRecord {
  id: string;
  facility: string;
  company: string;
  county: string;
  state: string;
  permitType: string;
  permitNumber: string;
  agency: string;
  issueDate: string;
  expirationDate: string | null;
  origin: DocumentOrigin;
  industry: string;
  equipment: string[];
  isDemo: true;
}

export const demoPermits: PermitRecord[] = [
  { id: "p1", facility: "Sample Ranch Tank Battery", company: "Sample Energy Co. (Demo)", county: "Example County", state: "TX", permitType: "Permit by Rule", permitNumber: "DEMO-0001", agency: "TCEQ", issueDate: "2025-03-14", expirationDate: null, origin: "demo", industry: "Oil & Gas", equipment: ["Storage Tanks", "Flares"], isDemo: true },
  { id: "p2", facility: "Example Compressor Station", company: "Example Midstream LLC (Demo)", county: "Example County", state: "NM", permitType: "Construction Permit", permitNumber: "DEMO-0002", agency: "NMED AQB", issueDate: "2024-11-02", expirationDate: null, origin: "demo", industry: "Midstream", equipment: ["Engines", "Dehydrators"], isDemo: true },
  { id: "p3", facility: "Placeholder Gas Plant", company: "Sample Processing (Demo)", county: "Example County", state: "TX", permitType: "Title V Operating Permit", permitNumber: "DEMO-0003", agency: "TCEQ", issueDate: "2023-06-21", expirationDate: "2028-06-21", origin: "demo", industry: "Oil & Gas", equipment: ["Heaters", "Flares", "Engines"], isDemo: true },
  { id: "p4", facility: "Demo SWD Facility", company: "Demo Water Solutions", county: "Example County", state: "NM", permitType: "Notice of Intent", permitNumber: "DEMO-0004", agency: "NMED AQB", issueDate: "2025-01-09", expirationDate: null, origin: "demo", industry: "Oil & Gas", equipment: ["Storage Tanks"], isDemo: true },
  { id: "p5", facility: "Sample Terminal", company: "Sample Refining (Demo)", county: "Example County", state: "TX", permitType: "NSR Permit", permitNumber: "DEMO-0005", agency: "TCEQ", issueDate: "2022-09-30", expirationDate: null, origin: "demo", industry: "Refining", equipment: ["Storage Tanks", "Loading"], isDemo: true },
];

export const originLabel: Record<DocumentOrigin, string> = {
  official: "Official source document",
  "aph-summary": "AirPermitHub summary",
  "user-upload": "User-uploaded document",
  demo: "Demo record (not a real permit)",
};
