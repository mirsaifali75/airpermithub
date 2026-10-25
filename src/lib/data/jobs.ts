/**
 * DEMO job listings. Every company and listing here is fictional sample data
 * used to design the job board. Replace with real postings from the Job table.
 */

export const jobCategories = [
  "Air Quality Engineer",
  "Environmental Engineer",
  "Air Permitting Specialist",
  "Environmental Specialist",
  "EHS Specialist",
  "EHS Manager",
  "Environmental Compliance",
  "Air Quality Consultant",
  "Regulatory Specialist",
  "Emissions Engineer",
  "LDAR",
  "Environmental Technician",
] as const;

export type JobType = "Full-time" | "Contract" | "Part-time" | "Internship";
export type Experience = "Entry" | "Mid" | "Senior" | "Lead";

export interface Job {
  id: string;
  title: string;
  category: (typeof jobCategories)[number];
  company: string;
  city: string;
  state: string;
  remote: boolean;
  type: JobType;
  experience: Experience;
  industry: string;
  salary?: string;
  postedDaysAgo: number;
  isDemo: true;
}

export const demoJobs: Job[] = [
  { id: "demo-1", title: "Air Permitting Engineer", category: "Air Quality Engineer", company: "Sample Energy Co. (Demo)", city: "Midland", state: "TX", remote: false, type: "Full-time", experience: "Mid", industry: "Oil & Gas", salary: "Salary shown when provided", postedDaysAgo: 1, isDemo: true },
  { id: "demo-2", title: "EHS Specialist – Midstream", category: "EHS Specialist", company: "Example Midstream LLC (Demo)", city: "Carlsbad", state: "NM", remote: false, type: "Full-time", experience: "Mid", industry: "Midstream", postedDaysAgo: 2, isDemo: true },
  { id: "demo-3", title: "Air Quality Consultant", category: "Air Quality Consultant", company: "Placeholder Environmental (Demo)", city: "Houston", state: "TX", remote: true, type: "Full-time", experience: "Senior", industry: "Consulting", postedDaysAgo: 3, isDemo: true },
  { id: "demo-4", title: "LDAR Technician", category: "LDAR", company: "Demo Field Services", city: "Odessa", state: "TX", remote: false, type: "Contract", experience: "Entry", industry: "Oil & Gas", postedDaysAgo: 4, isDemo: true },
  { id: "demo-5", title: "Environmental Compliance Manager", category: "Environmental Compliance", company: "Sample Refining (Demo)", city: "Corpus Christi", state: "TX", remote: false, type: "Full-time", experience: "Lead", industry: "Refining", postedDaysAgo: 6, isDemo: true },
  { id: "demo-6", title: "Emissions Engineer", category: "Emissions Engineer", company: "Example Power (Demo)", city: "Denver", state: "CO", remote: true, type: "Full-time", experience: "Mid", industry: "Power Generation", postedDaysAgo: 8, isDemo: true },
  { id: "demo-7", title: "Environmental Technician", category: "Environmental Technician", company: "Demo Aggregates Inc.", city: "San Antonio", state: "TX", remote: false, type: "Full-time", experience: "Entry", industry: "Aggregates", postedDaysAgo: 9, isDemo: true },
  { id: "demo-8", title: "Regulatory Specialist – Air", category: "Regulatory Specialist", company: "Sample Chemical (Demo)", city: "Baton Rouge", state: "LA", remote: false, type: "Full-time", experience: "Senior", industry: "Chemical", postedDaysAgo: 12, isDemo: true },
  { id: "demo-9", title: "Environmental Engineering Intern", category: "Environmental Engineer", company: "Placeholder Environmental (Demo)", city: "Albuquerque", state: "NM", remote: false, type: "Internship", experience: "Entry", industry: "Consulting", postedDaysAgo: 14, isDemo: true },
];
