export const site = {
  name: "AirPermitHub",
  domain: "airpermithub.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://airpermithub.com",
  tagline: "Air Permitting. Compliance. Simplified.",
  headline: "Air Permitting Made Simple.",
  description:
    "Your all-in-one platform for air permits, emissions calculations, regulations, compliance tools, and industry resources.",
  altMessage: "From Regulations to Operations.",
  disclaimer:
    "AirPermitHub provides educational, engineering, research, and compliance-support information. Information provided by the platform does not constitute legal advice and should not replace review of applicable regulations, permits, agency guidance, or consultation with qualified professionals.",
  screeningDisclaimer:
    "This tool provides preliminary regulatory screening and does not constitute legal or regulatory advice. Verify requirements with the applicable regulatory agency or qualified professional.",
} as const;

export type NavItem = { label: string; href: string; description?: string };

export const primaryNav: NavItem[] = [
  { label: "Permit Finder", href: "/permit-finder" },
  { label: "Calculators", href: "/calculators" },
  { label: "Tools", href: "/tools" },
  { label: "Regulations", href: "/regulations" },
  { label: "Permit Library", href: "/permits" },
  { label: "Compliance", href: "/compliance" },
  { label: "Industries", href: "/industries" },
  { label: "Jobs", href: "/jobs" },
  { label: "Resources", href: "/resources" },
];

export const resourcesMenu: NavItem[] = [
  { label: "Resource Center", href: "/resources", description: "Guides, checklists, FAQs, and references" },
  { label: "State Explorer", href: "/states", description: "All 50 states + DC: agencies, programs, forms" },
  { label: "Templates", href: "/templates", description: "AirPermitHub engineering templates" },
  { label: "Applicability Checker", href: "/applicability", description: "Screen federal programs by equipment" },
  { label: "Federal Air Rule Tracker", href: "/regulatory-updates", description: "New EPA rules and comment deadlines" },
  { label: "Glossary", href: "/glossary", description: "Air permitting terms with CFR citations" },
];

/**
 * Official social accounts. Leave null until the account exists; the footer
 * shows a muted "coming soon" icon instead of a dead link.
 */
export const social: { name: "LinkedIn" | "YouTube" | "X" | "Facebook"; href: string | null }[] = [
  { name: "LinkedIn", href: null },
  { name: "YouTube", href: null },
  { name: "X", href: null },
  { name: "Facebook", href: null },
];

export const footerNav: { title: string; links: NavItem[] }[] = [
  {
    title: "Tools",
    links: [
      { label: "Permit Finder", href: "/permit-finder" },
      { label: "Emission Calculators", href: "/calculators" },
      { label: "Practitioner Tools", href: "/tools" },
      { label: "Federal Air Rule Tracker", href: "/regulatory-updates" },
      { label: "Compliance Calendar", href: "/compliance" },
      { label: "Permit Library", href: "/permits" },
      { label: "Templates & Forms", href: "/templates" },
      { label: "Job Board", href: "/jobs" },
    ],
  },
  {
    title: "Regulations",
    links: [
      { label: "Federal", href: "/regulations/federal" },
      { label: "Federal Rule Library", href: "/regulations/library" },
      { label: "State Explorer", href: "/states" },
      { label: "EPA Guidance", href: "/regulations?tab=guidance" },
      { label: "Texas (TCEQ)", href: "/states/texas" },
      { label: "New Mexico (NMED)", href: "/states/new-mexico" },
    ],
  },
  {
    title: "Industries",
    links: [
      { label: "Oil & Gas", href: "/industries/oil-gas" },
      { label: "Midstream", href: "/industries/midstream" },
      { label: "Refining", href: "/industries/refining" },
      { label: "Power Generation", href: "/industries/power-generation" },
      { label: "Chemical", href: "/industries/chemical" },
      { label: "Manufacturing", href: "/industries/manufacturing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Guides", href: "/resources?tab=guides" },
      { label: "Templates", href: "/templates" },
      { label: "FAQs", href: "/resources?tab=faqs" },
      { label: "Glossary", href: "/glossary" },
      { label: "Search", href: "/search" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "How We Verify", href: "/verification" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Use", href: "/terms" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
];
