import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { glossary } from "./data/glossary";
import { guides } from "./data/guides";
import { federalRegulations } from "./data/regulations";
import { listStateProfiles } from "./data/state-profiles";
import { converters } from "./tools/converters";
import { nsrRuleText } from "./tools/nsr";
import { RT, ecfrHref, psdSignificance } from "./tools/rule-text";

/**
 * Every checkable claim the site publishes, for scripts/verify-sources.mjs.
 * With VERIFY_OUT set, writes them to a JSON file. Kinds:
 *  - quote: text shown as verbatim; must appear word for word at `url`
 *  - threshold: numbers restated from `url`; each number must appear there
 *  - name: an agency or program name that should appear on its own page
 *  - link: a source link; must load
 *  - cfr: a 40 CFR citation; the section and paragraph must exist in eCFR
 *  - cfr-quote: rule text quoted from a 40 CFR paragraph
 *  - cfr-term: a glossary term (or the cite's `match` wording, " | " between
 *    required pieces); must appear in the cited 40 CFR paragraph
 *  - citation: a state rule citation; its number should appear at `url`
 */
export interface Claim {
  id: string;
  kind: "quote" | "threshold" | "name" | "link" | "cfr" | "cfr-quote" | "cfr-term" | "citation";
  where: string;
  url?: string;
  text: string;
  cite?: string;
  /** More pages to read with `url`, for thresholds summarized from two documents. */
  also?: string[];
}

const CFR_RE = /40 CFR (?:§\s*)?(\d+)\.(\d+[a-zA-Z]*)((?:\([0-9a-zA-Z]+\))*)/g;

export function collectClaims(): Claim[] {
  const out: Claim[] = [];
  const push = (c: Omit<Claim, "id">) => out.push({ id: `c${out.length + 1}`, ...c });
  const cfrIn = (text: string | undefined, where: string) => {
    for (const m of (text ?? "").matchAll(CFR_RE)) push({ kind: "cfr", where, text: m[0], cite: `${m[1]}.${m[2]}${m[3]}` });
  };

  for (const s of listStateProfiles()) {
    const w = `state:${s.code}`;
    push({ kind: "name", where: `${w}:agency`, url: s.agency.url, text: s.agency.name });
    if (s.agency.permitsUrl) push({ kind: "link", where: `${w}:agency-permits`, url: s.agency.permitsUrl, text: `${s.agency.name} permits page` });
    for (const la of s.localAgencies ?? []) push({ kind: "name", where: `${w}:local`, url: la.url, text: la.name });
    const programs = [...s.permitTypes.map((p) => ({ p, k: "program" })), ...(s.oilAndGas?.programs ?? []).map((p) => ({ p, k: "oil-gas" }))];
    for (const { p, k } of programs) {
      const pw = `${w}:${k}:${p.name}`;
      if (p.url) push({ kind: "link", where: pw, url: p.url, text: p.name });
      const quoteUrl = p.quoteSource?.url ?? p.url;
      const thresholdsUrl = p.thresholdsSource?.url ?? p.url;
      if (quoteUrl && p.quote) push({ kind: "quote", where: pw, url: quoteUrl, text: p.quote });
      if (thresholdsUrl && p.thresholds) push({ kind: "threshold", where: pw, url: thresholdsUrl, text: p.thresholds, ...(p.thresholdsSource ? { also: [p.url, p.quoteSource?.url].filter((u): u is string => !!u && u !== thresholdsUrl) } : {}) });
      if (p.quoteSource) push({ kind: "link", where: pw, url: p.quoteSource.url, text: p.quoteSource.name });
      if (p.thresholdsSource) push({ kind: "link", where: pw, url: p.thresholdsSource.url, text: p.thresholdsSource.name });
      if (p.url && p.citation) push({ kind: "citation", where: pw, url: p.url, text: p.citation });
      cfrIn(p.citation, pw);
      cfrIn(p.description, pw);
    }
    for (const r of s.regulations) {
      if (r.url) push({ kind: "link", where: `${w}:regulation`, url: r.url, text: r.title });
      if (r.url) push({ kind: "citation", where: `${w}:regulation`, url: r.url, text: r.citation });
      cfrIn(r.citation, `${w}:regulation`);
    }
    for (const [k, links] of [["form", s.forms], ["guidance", s.guidance], ["source", s.sources]] as const) for (const l of links) push({ kind: "link", where: `${w}:${k}`, url: l.url, text: l.name });
    if (s.ePermitting) push({ kind: "link", where: `${w}:epermitting`, url: s.ePermitting.url, text: s.ePermitting.name });
    if (s.fees) push({ kind: "link", where: `${w}:fees`, url: s.fees.url, text: s.fees.name });
    cfrIn(s.overview, `${w}:overview`);
    cfrIn(s.oilAndGas?.summary, `${w}:oil-gas`);
  }

  for (const t of glossary) {
    for (const c of t.cites) {
      const m = c.url.match(/section-(\d+\.\d+[a-zA-Z]*)(?:#p-[\d.a-zA-Z]+((?:\([0-9a-zA-Z]+\))+))?/);
      if (m) push({ kind: "cfr-term", where: `glossary:${t.slug}`, url: c.url, text: c.match ?? t.term, cite: `${m[1]}${m[2] ?? ""}` });
      else push({ kind: "link", where: `glossary:${t.slug}`, url: c.url, text: c.label });
    }
    cfrIn(t.definition, `glossary:${t.slug}`);
  }

  for (const x of nsrRuleText.quotes) {
    const m = x.cite.match(/40 CFR (\d+\.\d+)((?:\([0-9a-zA-Z]+\))*)/);
    if (m) push({ kind: "cfr-quote", where: "tool:nsr-baseline", url: nsrRuleText.current.url, text: x.text, cite: `${m[1]}${m[2]}` });
  }

  // Rule text the screening and design tools quote (src/lib/tools/rule-text.ts)
  for (const [key, x] of Object.entries(RT)) {
    const w = `tool-rule-text:${key}`;
    if (x.url) { push({ kind: "quote", where: w, url: x.url, text: x.text }); continue; }
    const m = x.cite.match(/40 CFR (\d+\.\d+[a-zA-Z]*)((?:\([0-9a-zA-Z]+\))*)/);
    if (m) push({ kind: "cfr-quote", where: w, url: ecfrHref(x.cite) ?? undefined, text: x.text, cite: `${m[1]}${m[2]}` });
  }
  for (const r of psdSignificance) push({ kind: "cfr-quote", where: "tool-rule-text:psd-significance", url: ecfrHref("40 CFR 52.21(b)(23)(i)") ?? undefined, text: r.row, cite: "52.21(b)(23)(i)" });

  for (const g of guides) {
    const w = `guide:${g.slug}`;
    const prose = [g.summary, ...g.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])])];
    for (const p of prose) {
      cfrIn(p, w);
      for (const q of p.matchAll(/“([^”]{12,})”/g)) {
        // Quoted rule text: checked against each eCFR section the guide cites.
        const cites = g.sources.map((s) => s.url.match(/section-(\d+\.\d+[a-zA-Z]*)/)?.[1]).filter(Boolean) as string[];
        if (cites.length && q[1].split(/\s+/).length >= 3) push({ kind: "cfr-quote", where: w, text: q[1], cite: cites.join("|") });
      }
    }
    for (const s of g.sources) push({ kind: "link", where: w, url: s.url, text: s.title });
  }

  for (const r of federalRegulations) {
    const w = `regulation:${r.slug}`;
    for (const key of ["applicability", "requirements", "monitoring", "testing", "recordkeeping", "reporting", "definitions"] as const) {
      for (const p of r[key].pointers ?? []) push({ kind: "cfr", where: `${w}:${key}`, text: `${p.citation} (${p.label})`, cite: p.citation.replace(/^40 CFR /, "") });
      cfrIn(r[key].summary ?? undefined, `${w}:${key}`);
    }
    cfrIn(r.summary, w);
    for (const s of r.sources) push({ kind: "link", where: w, url: s.url, text: s.title });
  }

  for (const c of converters) for (const s of c.sources) push({ kind: "link", where: `converter:${c.slug}`, url: s.url, text: s.title });
  return out;
}

describe("verification claims", () => {
  const claims = collectClaims();
  it("cover the site's sourced content", () => {
    expect(claims.filter((c) => c.kind === "quote").length).toBeGreaterThan(30);
    expect(claims.filter((c) => c.kind === "cfr-term").length).toBeGreaterThan(40);
    for (const c of claims) if (c.url) expect(() => new URL(c.url!), c.where).not.toThrow();
  });
  it.runIf(!!process.env.VERIFY_OUT)("export for the source verifier", () => {
    writeFileSync(process.env.VERIFY_OUT!, JSON.stringify(claims, null, 1));
  });
});
