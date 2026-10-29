/**
 * The Ask page: question topics, the pages worth trying first for each, and
 * the email a question becomes. Questions leave through the visitor's own
 * email app; the site never sends or stores them.
 */

export interface AskTopic {
  slug: string;
  label: string;
  /** Pages that often answer this kind of question, shown before sending. */
  tryFirst: { label: string; href: string }[];
}

export const askTopics: AskTopic[] = [
  { slug: "applicability", label: "Does my facility need a permit?", tryFirst: [{ label: "Permit Finder", href: "/permit-finder" }, { label: "Applicability Checker", href: "/applicability" }, { label: "State Explorer", href: "/states" }] },
  { slug: "pte", label: "Potential to emit and emission calculations", tryFirst: [{ label: "Emission calculators", href: "/calculators" }, { label: "Unit converters", href: "/tools#converters" }, { label: "Glossary: potential to emit", href: "/glossary#potential-to-emit" }] },
  { slug: "nsr", label: "NSR, PSD, and modifications", tryFirst: [{ label: "NSR baseline calculator", href: "/tools/nsr-baseline-calculator" }, { label: "Choosing an NSR baseline period", href: "/resources/choosing-an-nsr-baseline-period" }] },
  { slug: "title-v", label: "Title V operating permits", tryFirst: [{ label: "Compliance matrix builder", href: "/tools/compliance-matrix-builder" }, { label: "Building a Title V compliance matrix", href: "/resources/building-a-title-v-compliance-matrix" }, { label: "Title V overview", href: "/regulations/title-v" }] },
  { slug: "nsps-neshap", label: "NSPS and NESHAP (MACT) applicability", tryFirst: [{ label: "NSPS overview", href: "/regulations/nsps" }, { label: "NESHAP overview", href: "/regulations/neshap" }, { label: "Federal Air Rule Tracker", href: "/regulatory-updates" }] },
  { slug: "testing", label: "Monitoring, stack tests, and CEMS", tryFirst: [{ label: "Preparing for a performance test", href: "/resources/preparing-for-a-performance-test" }, { label: "Stack test results: O2 correction and units", href: "/resources/stack-test-results-o2-correction-and-units" }, { label: "Unit converters", href: "/tools#converters" }] },
  { slug: "records", label: "Recordkeeping, reporting, and deviations", tryFirst: [{ label: "Rolling 12-month tracker", href: "/tools/rolling-12-month-tracker" }, { label: "Title V deviation log", href: "/tools/deviation-log" }, { label: "Compliance Calendar", href: "/compliance" }] },
  { slug: "state", label: "State permits, permits by rule, and general permits", tryFirst: [{ label: "State Explorer", href: "/states" }, { label: "Permit Finder", href: "/permit-finder" }] },
  { slug: "oil-gas", label: "Oil and gas: tanks, engines, flares, LDAR", tryFirst: [{ label: "Oil & Gas industry page", href: "/industries/oil-gas" }, { label: "Emission calculators", href: "/calculators" }] },
  { slug: "careers", label: "Careers in air permitting", tryFirst: [{ label: "Job board", href: "/jobs" }] },
  { slug: "correction", label: "Something on this site is wrong", tryFirst: [] },
  { slug: "other", label: "Something else", tryFirst: [{ label: "Glossary", href: "/glossary" }, { label: "Search the site", href: "/search" }] },
];

export const askRoles = ["Facility or operations", "Environmental or EHS staff", "Consultant", "Agency staff", "Student or job seeker", "Other"] as const;

/** Mail apps cut long mailto links, so the two text boxes are capped. */
export const askLimits = { question: 1500, context: 600 } as const;

export interface AskDraft {
  topic: string;
  question: string;
  context: string;
  state: string;
  industry: string;
  role: string;
  neededBy: string;
  page: string;
  name: string;
  publicOk: boolean;
}

export const emptyAsk = (): AskDraft => ({ topic: "", question: "", context: "", state: "", industry: "", role: "", neededBy: "", page: "", name: "", publicOk: false });

export const getAskTopic = (slug: string) => askTopics.find((t) => t.slug === slug);

/** Subject and plain-text body for the email a question becomes. */
export function askEmail(d: AskDraft, siteUrl: string): { subject: string; body: string } {
  const topic = getAskTopic(d.topic);
  const correction = d.topic === "correction";
  const lead = d.question.replace(/\s+/g, " ").trim();
  const short = lead.length > 60 ? `${lead.slice(0, 59).trimEnd()}…` : lead;
  const subject = `${correction ? "[AirPermitHub correction]" : "[AirPermitHub question]"} ${short || topic?.label || "Question"}`;
  const facts: [string, string][] = [
    ["Topic", topic?.label ?? ""],
    ["Page", correction ? d.page : ""],
    ["State", d.state],
    ["Industry", d.industry],
    ["Role", d.role],
    ["Needed by", d.neededBy],
  ];
  const lines = [
    ...facts.filter(([, v]) => v.trim()).map(([k, v]) => `${k}: ${v.trim()}`),
    correction ? "" : `Public answer: ${d.publicOk ? "OK to answer publicly with names, permit numbers, and locations removed" : "No, keep this private"}`,
    "",
    correction ? "What's wrong:" : "Question:",
    d.question.trim(),
  ];
  if (d.context.trim()) lines.push("", correction ? "Correct information and source:" : "What I've checked so far:", d.context.trim());
  lines.push("", d.name.trim() ? `From: ${d.name.trim()}` : "", `Sent from ${siteUrl}/ask`);
  return { subject, body: lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").trim() };
}

export const mailtoHref = (to: string, subject: string, body: string) =>
  `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
