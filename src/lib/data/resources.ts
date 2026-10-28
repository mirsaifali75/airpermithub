/**
 * Resource center catalog. Items are planned editorial guides; nothing here is
 * presented as published content until `status` is "published".
 */

export const resourceCategories = [
  { slug: "air-permitting", name: "Air Permitting" },
  { slug: "emission-calculations", name: "Emission Calculations" },
  { slug: "compliance", name: "Compliance" },
  { slug: "federal-regulations", name: "Federal Regulations" },
  { slug: "state-regulations", name: "State Regulations" },
  { slug: "oil-gas", name: "Oil & Gas" },
  { slug: "environmental-engineering", name: "Environmental Engineering" },
  { slug: "templates", name: "Templates" },
  { slug: "checklists", name: "Checklists" },
  { slug: "training", name: "Training" },
  { slug: "career", name: "Career Resources" },
] as const;

export type ResourceCategory = (typeof resourceCategories)[number]["slug"];

export interface Resource {
  slug: string;
  title: string;
  category: ResourceCategory;
  excerpt: string;
  readMinutes: number;
  status: "planned" | "draft" | "published";
}

export const resources: Resource[] = [
  { slug: "where-to-start-air-permit", title: "Where to start when a facility needs an air permit", category: "air-permitting", excerpt: "A practical sequence: confirm jurisdiction, inventory equipment, estimate potential to emit, then screen authorization options.", readMinutes: 8, status: "planned" },
  { slug: "potential-to-emit-explained", title: "Potential to emit, explained for engineers", category: "emission-calculations", excerpt: "How PTE differs from actual emissions, and why enforceable limits matter when you calculate it.", readMinutes: 10, status: "planned" },
  { slug: "reading-a-title-v-permit", title: "How to read a Title V permit", category: "compliance", excerpt: "Where applicable requirements, monitoring, and reporting obligations live in a typical operating permit.", readMinutes: 12, status: "planned" },
  { slug: "nsps-subpart-navigation", title: "Navigating NSPS subparts by equipment", category: "federal-regulations", excerpt: "Using equipment type and construction dates to narrow which Part 60 subparts deserve a closer look.", readMinutes: 9, status: "planned" },
  { slug: "tank-emissions-methods", title: "Storage tank emission methods compared", category: "oil-gas", excerpt: "Working, breathing, and flash losses, and how method choice and inputs change results.", readMinutes: 11, status: "planned" },
  { slug: "compliance-calendar-setup", title: "Building a compliance calendar from permit conditions", category: "compliance", excerpt: "Turning permit terms into tracked tasks with owners, due dates, and evidence.", readMinutes: 7, status: "planned" },
  { slug: "texas-authorization-options", title: "Texas air authorization options overview", category: "state-regulations", excerpt: "How PBRs, standard permits, and NSR permits fit together in the TCEQ program.", readMinutes: 9, status: "planned" },
  { slug: "air-quality-career-paths", title: "Career paths in air quality engineering", category: "career", excerpt: "Roles, skills, and certifications across consulting, industry, and agencies.", readMinutes: 6, status: "planned" },
];
