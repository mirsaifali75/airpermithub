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

/** Role groups used for the quick chips on the job board. */
export const roleGroups: { label: string; categories: string[] }[] = [
  { label: "Air Permitting", categories: ["Air Quality Engineer", "Air Permitting Specialist", "Emissions Engineer"] },
  { label: "Compliance", categories: ["Environmental Compliance", "Regulatory Specialist", "LDAR"] },
  { label: "Environmental", categories: ["Environmental Engineer", "Environmental Specialist", "Environmental Technician"] },
  { label: "Consulting", categories: ["Air Quality Consultant"] },
  { label: "EHS", categories: ["EHS Specialist", "EHS Manager"] },
];

export interface DemoCompany {
  slug: string;
  name: string;
  initials: string;
  color: string;
  kind: string;
  hq: string;
  locations: string[];
  about: string;
  isDemo: true;
}

/** Fictional employers. AirPermitHub never shows a real company's name or logo without its permission. */
export const demoCompanies: DemoCompany[] = [
  { slug: "sample-energy", name: "Sample Energy Co. (Demo)", initials: "SE", color: "bg-brand-600", kind: "Oil & Gas Operator · Fictional", hq: "Midland, TX", locations: ["Midland, TX", "Odessa, TX", "Carlsbad, NM"], about: "A fictional upstream operator used to preview company pages. Real employer pages will show the company's own description, locations, and openings.", isDemo: true },
  { slug: "example-midstream", name: "Example Midstream LLC (Demo)", initials: "EM", color: "bg-eco-600", kind: "Midstream · Fictional", hq: "Carlsbad, NM", locations: ["Carlsbad, NM", "Pecos, TX"], about: "A fictional gathering and compression company used to preview the job board.", isDemo: true },
  { slug: "placeholder-environmental", name: "Placeholder Environmental (Demo)", initials: "PE", color: "bg-violet-600", kind: "Environmental Consulting · Fictional", hq: "Houston, TX", locations: ["Houston, TX", "Albuquerque, NM", "Remote"], about: "A fictional air quality consultancy used to preview the job board.", isDemo: true },
  { slug: "demo-field-services", name: "Demo Field Services", initials: "DF", color: "bg-orange-700", kind: "Field Services · Fictional", hq: "Odessa, TX", locations: ["Odessa, TX"], about: "A fictional LDAR and field services company used to preview the job board.", isDemo: true },
  { slug: "sample-refining", name: "Sample Refining (Demo)", initials: "SR", color: "bg-rose-700", kind: "Refining · Fictional", hq: "Corpus Christi, TX", locations: ["Corpus Christi, TX"], about: "A fictional refiner used to preview the job board.", isDemo: true },
  { slug: "example-power", name: "Example Power (Demo)", initials: "EP", color: "bg-cyan-700", kind: "Power Generation · Fictional", hq: "Denver, CO", locations: ["Denver, CO", "Remote"], about: "A fictional power producer used to preview the job board.", isDemo: true },
  { slug: "demo-aggregates", name: "Demo Aggregates Inc.", initials: "DA", color: "bg-slate-600", kind: "Mining & Aggregates · Fictional", hq: "San Antonio, TX", locations: ["San Antonio, TX"], about: "A fictional aggregates producer used to preview the job board.", isDemo: true },
  { slug: "sample-chemical", name: "Sample Chemical (Demo)", initials: "SC", color: "bg-teal-700", kind: "Chemical · Fictional", hq: "Baton Rouge, LA", locations: ["Baton Rouge, LA"], about: "A fictional chemical manufacturer used to preview the job board.", isDemo: true },
];

export const companyFor = (name: string) => demoCompanies.find((c) => c.name === name);
export const getCompany = (slug: string) => demoCompanies.find((c) => c.slug === slug);

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
  { id: "demo-10", title: "Air Permitting Specialist", category: "Air Permitting Specialist", company: "Sample Energy Co. (Demo)", city: "Carlsbad", state: "NM", remote: false, type: "Full-time", experience: "Mid", industry: "Oil & Gas", postedDaysAgo: 2, isDemo: true },
  { id: "demo-11", title: "Air Compliance Specialist", category: "Environmental Compliance", company: "Example Midstream LLC (Demo)", city: "Pecos", state: "TX", remote: false, type: "Full-time", experience: "Mid", industry: "Midstream", postedDaysAgo: 5, isDemo: true },
  { id: "demo-12", title: "Senior Air Quality Engineer", category: "Air Quality Engineer", company: "Placeholder Environmental (Demo)", city: "Albuquerque", state: "NM", remote: false, type: "Full-time", experience: "Senior", industry: "Consulting", postedDaysAgo: 7, isDemo: true },
  { id: "demo-9", title: "Environmental Engineering Intern", category: "Environmental Engineer", company: "Placeholder Environmental (Demo)", city: "Albuquerque", state: "NM", remote: false, type: "Internship", experience: "Entry", industry: "Consulting", postedDaysAgo: 14, isDemo: true },
];
