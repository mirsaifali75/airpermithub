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
  { label: "Home", href: "/" },
  { label: "Permit Finder", href: "/permit-finder" },
  { label: "Calculators", href: "/calculators" },
  { label: "Regulations", href: "/regulations" },
  { label: "Permit Library", href: "/permits" },
  { label: "Compliance", href: "/compliance" },
  { label: "Jobs", href: "/jobs" },
  { label: "Resources", href: "/resources" },
];

export const resourcesMenu: NavItem[] = [
  { label: "Resource Center", href: "/resources", description: "Guides, checklists, and references" },
  { label: "Templates", href: "/templates", description: "AirPermitHub engineering templates" },
  { label: "Industries", href: "/industries", description: "Industry-specific permitting hubs" },
  { label: "State Hubs", href: "/states", description: "State agency programs and resources" },
];

export const footerNav: { title: string; links: NavItem[] }[] = [
  {
    title: "Tools",
    links: [
      { label: "Permit Finder", href: "/permit-finder" },
      { label: "Calculators", href: "/calculators" },
      { label: "Permit Search", href: "/permits" },
      { label: "Applicability Checker", href: "/applicability" },
      { label: "Compliance", href: "/compliance" },
    ],
  },
  {
    title: "Regulations",
    links: [
      { label: "Federal", href: "/regulations/federal" },
      { label: "Texas", href: "/states/texas" },
      { label: "New Mexico", href: "/states/new-mexico" },
      { label: "State Resources", href: "/states" },
    ],
  },
  {
    title: "Industries",
    links: [
      { label: "Oil & Gas", href: "/industries/oil-gas" },
      { label: "Midstream", href: "/industries/midstream" },
      { label: "Refining", href: "/industries/refining" },
      { label: "Manufacturing", href: "/industries/manufacturing" },
    ],
  },
  {
    title: "Jobs",
    links: [
      { label: "Air Quality Jobs", href: "/jobs" },
      { label: "Post a Job", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Guides", href: "/resources" },
      { label: "Templates", href: "/templates" },
    ],
  },
  {
    title: "AirPermitHub",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
];
