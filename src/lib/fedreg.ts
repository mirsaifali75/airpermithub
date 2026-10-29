/**
 * EPA air rules from the Federal Register API (federalregister.gov). Titles,
 * dates, and links are shown as published; nothing here is reviewed or
 * summarized by AirPermitHub. The page revalidates every few hours, and when
 * the API can't be reached it shows links to the Federal Register instead.
 */

export const FR_API = "https://www.federalregister.gov/api/v1/documents.json";

export const updateGroups = [
  { key: "nsps", label: "NSPS", long: "New Source Performance Standards (40 CFR Part 60)", parts: ["60"], perPage: 20 },
  { key: "neshap", label: "NESHAP", long: "Hazardous air pollutant standards (40 CFR Parts 61 and 63)", parts: ["61", "63"], perPage: 20 },
  { key: "sip", label: "SIPs & state plans", long: "State implementation plans and state plans (40 CFR Parts 52 and 62)", parts: ["52", "62"], perPage: 40 },
  { key: "permits", label: "Operating permits", long: "Title V operating permit programs (40 CFR Parts 70 and 71)", parts: ["70", "71"], perPage: 15 },
  { key: "nsr", label: "NSR & planning rules", long: "Implementation plan requirements, including NSR (40 CFR Part 51)", parts: ["51"], perPage: 15 },
  { key: "naaqs", label: "NAAQS & designations", long: "Ambient standards and area designations (40 CFR Parts 50 and 81)", parts: ["50", "81"], perPage: 15 },
  { key: "ghg", label: "GHG reporting", long: "Greenhouse Gas Reporting Program (40 CFR Part 98)", parts: ["98"], perPage: 15 },
] as const;

export type GroupKey = (typeof updateGroups)[number]["key"];

export interface FrDoc {
  documentNumber: string;
  title: string;
  type: "Rule" | "Proposed Rule";
  abstract: string | null;
  url: string;
  published: string;
  effective: string | null;
  commentsClose: string | null;
  parts: string[];
  dockets: string[];
  groups: GroupKey[];
}

const FIELDS = ["title", "type", "abstract", "document_number", "html_url", "publication_date", "effective_on", "comments_close_on", "cfr_references", "docket_ids"];

export function frUrl(part: string, perPage: number) {
  const q = new URLSearchParams();
  q.set("per_page", String(perPage));
  q.set("order", "newest");
  q.append("conditions[agencies][]", "environmental-protection-agency");
  q.append("conditions[type][]", "RULE");
  q.append("conditions[type][]", "PRORULE");
  q.set("conditions[cfr][title]", "40");
  q.set("conditions[cfr][part]", part);
  for (const f of FIELDS) q.append("fields[]", f);
  return `${FR_API}?${q.toString()}`;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Validates one API result. Returns null for anything that isn't a usable rule or proposed rule. */
export function normalizeDoc(raw: unknown, group: GroupKey): FrDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title), num = str(r.document_number), url = str(r.html_url);
  if (!title || !num || !url || !url.startsWith("https://www.federalregister.gov/") || !isDate(r.publication_date)) return null;
  if (r.type !== "Rule" && r.type !== "Proposed Rule") return null;
  const refs = Array.isArray(r.cfr_references) ? r.cfr_references : [];
  const parts = [...new Set(refs.filter((c) => c && Number((c as Record<string, unknown>).title) === 40).map((c) => String((c as Record<string, unknown>).part)).filter((p) => /^\d+$/.test(p)))];
  return {
    documentNumber: num,
    title,
    type: r.type,
    abstract: str(r.abstract)?.slice(0, 600) ?? null,
    url,
    published: r.publication_date,
    effective: isDate(r.effective_on) ? r.effective_on : null,
    commentsClose: isDate(r.comments_close_on) ? r.comments_close_on : null,
    parts,
    dockets: Array.isArray(r.docket_ids) ? r.docket_ids.filter((d): d is string => typeof d === "string").slice(0, 3) : [],
    groups: [group],
  };
}

/** Merges documents found under several groups, newest first. */
export function mergeDocs(lists: FrDoc[][]): FrDoc[] {
  const byNum = new Map<string, FrDoc>();
  for (const d of lists.flat()) {
    const prev = byNum.get(d.documentNumber);
    if (prev) prev.groups = [...new Set([...prev.groups, ...d.groups])];
    else byNum.set(d.documentNumber, { ...d, groups: [...d.groups] });
  }
  return [...byNum.values()].sort((a, b) => b.published.localeCompare(a.published) || a.title.localeCompare(b.title));
}

export interface UpdatesResult {
  docs: FrDoc[];
  fetchedAt: string;
  /** Parts that could not be fetched. */
  failed: string[];
}

export async function fetchAirRuleUpdates(): Promise<UpdatesResult> {
  const jobs = updateGroups.flatMap((g) => g.parts.map((part) => ({ g, part })));
  const failed: string[] = [];
  const lists = await Promise.all(
    jobs.map(async ({ g, part }) => {
      try {
        const res = await fetch(frUrl(part, g.perPage), { next: { revalidate: 21600 }, signal: AbortSignal.timeout(10000), headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { results?: unknown[] };
        return (json.results ?? []).map((x) => normalizeDoc(x, g.key)).filter((d): d is FrDoc => !!d);
      } catch {
        failed.push(part);
        return [];
      }
    }),
  );
  const docs = mergeDocs(lists);
  console.log(`[regulatory-updates] ${docs.length} Federal Register documents; failed parts: ${failed.join(",") || "none"}`);
  return { docs, fetchedAt: new Date().toISOString(), failed };
}
