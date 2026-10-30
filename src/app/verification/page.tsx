import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { VerifyNotice } from "@/components/ui/Notices";
import { listStateProfiles } from "@/lib/data/state-profiles";
import { verificationStatus, type Tally } from "@/lib/data/verification";

export const metadata: Metadata = {
  title: "How We Verify Air Permitting Information",
  description: "How AirPermitHub checks every quote, threshold, rule citation, and link against government sources and current eCFR, and what the last check found.",
  alternates: { canonical: "/verification" },
};

const kinds: { key: string; label: string; what: string }[] = [
  { key: "quote", label: "Quotes", what: "Text shown as a quotation must appear word for word in the cited agency page or PDF. Spacing, punctuation, and line breaks are ignored; nothing else is. Excerpts joined with an ellipsis must each match." },
  { key: "threshold", label: "Threshold summaries", what: "Summaries are not quotations, so each number in them must appear in the document the summary names. Rule numbers and publication dates are not counted." },
  { key: "cfr", label: "40 CFR citations", what: "Each section and paragraph we cite, such as 52.21(b)(48)(ii)(D), must exist in the current eCFR with that exact designation." },
  { key: "cfr-quote", label: "Federal rule quotes", what: "Quoted rule text in tools and guides must appear in the cited eCFR paragraph." },
  { key: "cfr-term", label: "Glossary citations", what: "Each glossary citation must exist in eCFR and contain the defined term, or the wording the entry names when the provision governs a term rather than defining it." },
  { key: "name", label: "Agency names", what: "The agency name must appear on the agency page we link, either in full or with every word of it present." },
  { key: "citation", label: "State rule citations", what: "The rule number we cite should appear on the page we link. Many program pages do not name their rule, so a miss here is a prompt to review, not proof of an error." },
  { key: "link", label: "Links", what: "Every source link must load. Sites that refuse automated requests are reported separately, not counted as broken." },
];

function pct(t: Tally) {
  const read = t.pass + t.fail;
  return read ? Math.round((t.pass / read) * 100) : 0;
}

export default function VerificationPage() {
  const status = verificationStatus();
  const states = listStateProfiles();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "How we verify" }]}
        eyebrow="Methodology"
        title="How We Verify the Information Here"
        icon={<ShieldCheck className="h-7 w-7" />}
        description="Every quote, threshold, rule citation, and link on AirPermitHub is checked against the government source it cites. This page explains the check and shows what the last one found."
      />
      <div className="container-page space-y-10 py-10">
        {status ? (
          <section aria-labelledby="last-h">
            <h2 id="last-h" className="text-xl font-bold text-ink">Last check: {status.checkedOn}</h2>
            <p className="mt-1 text-sm text-muted">Federal rule text compared with eCFR current through {status.ecfrDate}. &ldquo;Could not read&rdquo; means the agency site refused the request or needs a browser to show its text; those items are checked by hand where we can.</p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="border-b border-line text-xs text-muted uppercase">
                  <tr><th className="px-4 py-3 font-semibold">What we check</th><th className="px-4 py-3 font-semibold">Confirmed</th><th className="px-4 py-3 font-semibold">Under review</th><th className="px-4 py-3 font-semibold">Could not read</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {kinds.filter((k) => status.totals[k.key]).map((k) => {
                    const t = status.totals[k.key];
                    return (
                      <tr key={k.key}>
                        <td className="px-4 py-3 font-medium text-ink">{k.label}</td>
                        <td className="px-4 py-3 tabular-nums">{t.pass} <span className="text-muted">({pct(t)}% of those read)</span></td>
                        <td className="px-4 py-3 tabular-nums">{t.fail}</td>
                        <td className="px-4 py-3 tabular-nums text-muted">{t.unchecked}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <VerifyNotice>The first automated check has not been published yet.</VerifyNotice>
        )}

        <section aria-labelledby="how-h" className="max-w-3xl">
          <h2 id="how-h" className="text-xl font-bold text-ink">What the check does</h2>
          <p className="mt-2 text-sm text-slate-700">Once a month, and whenever an editor runs it after changes, a script fetches every page, PDF, and eCFR section the site cites and compares it with what we publish. Anything that does not match goes to an editor, who corrects it to the source&apos;s exact wording, points it at the right document, or removes it.</p>
          <dl className="mt-4 space-y-3">
            {kinds.map((k) => (
              <div key={k.key} className="rounded-xl border border-line bg-white p-4">
                <dt className="font-semibold text-ink">{k.label}</dt>
                <dd className="mt-1 text-sm text-slate-700">{k.what}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-slate-700">
            Federal rule pages in the <Link href="/regulations/library" className="font-semibold text-brand-600 hover:underline">Rule Library</Link> are built from eCFR itself and refreshed weekly; a rule change is reviewed before it appears. A match means our text agrees with the source on the check date. It does not mean a permit is or is not required for a facility; that depends on the full rule and the facts, so confirm with the agency.
          </p>
        </section>

        {status && (
          <section aria-labelledby="states-h">
            <h2 id="states-h" className="text-xl font-bold text-ink">By state</h2>
            <p className="mt-1 text-sm text-muted">Confirmed out of all items on each state page. Each quote and threshold on a state page also shows its own result.</p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-line text-xs text-muted uppercase">
                  <tr><th className="px-4 py-3 font-semibold">State</th><th className="px-4 py-3 font-semibold">Quotes</th><th className="px-4 py-3 font-semibold">Thresholds</th><th className="px-4 py-3 font-semibold">Links</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {states.map((s) => {
                    const t = status.states[s.code] ?? {};
                    const cell = (k: string) => {
                      const c = t[k];
                      if (!c) return <span className="text-muted">none</span>;
                      return <>{c.pass} of {c.pass + c.fail + c.unchecked}{c.unchecked > 0 && <span className="text-muted"> · {c.unchecked} unreadable</span>}</>;
                    };
                    return (
                      <tr key={s.code}>
                        <td className="px-4 py-2.5"><Link href={`/states/${s.slug}`} className="font-medium text-brand-600 hover:underline">{s.name}</Link></td>
                        <td className="px-4 py-2.5 tabular-nums">{cell("quote")}</td>
                        <td className="px-4 py-2.5 tabular-nums">{cell("threshold")}</td>
                        <td className="px-4 py-2.5 tabular-nums">{cell("link")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <VerifyNotice>
          Found something that does not match the source? <Link href="/contact" className="font-semibold underline">Tell us</Link> and include the page and the source link.
        </VerifyNotice>
      </div>
    </>
  );
}
