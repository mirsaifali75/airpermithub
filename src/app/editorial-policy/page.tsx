import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/ProsePage";
import { correctionLog } from "@/lib/data/corrections";
import { verificationStatus } from "@/lib/data/verification";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Editorial and Corrections Policy",
  description: "Where AirPermitHub's regulatory content comes from, how it is checked against government sources, and how errors are corrected in public.",
  alternates: { canonical: "/editorial-policy" },
};

const link = "font-semibold text-brand-600 hover:underline";

export default function Page() {
  const checkedOn = verificationStatus()?.checkedOn;
  return (
    <ProsePage
      title="Editorial and Corrections Policy"
      eyebrow="How we earn trust"
      description="Where our content comes from, how it is checked, and what happens when we get something wrong."
    >
      <h2>1. Sources we use</h2>
      <p>Regulatory facts on AirPermitHub come only from official government sources: the eCFR and Federal Register, EPA pages, and state and local agency websites, rules, and registers. We do not use trade press, vendor blogs, forums, or memory as a source for a regulatory fact.</p>

      <h2>2. How facts are written</h2>
      <ul>
        <li><strong>Numbers are quoted, not paraphrased.</strong> A threshold, limit, or deadline appears as a word-for-word quote with a link to the page it came from. Short summaries of a threshold are labeled &quot;summarized from source&quot;.</li>
        <li><strong>Nothing is filled in by guessing.</strong> If an official page does not state a number, we leave it out and say so. Calculators ship with no emission factors and no prefilled regulatory limits; you enter your own.</li>
        <li><strong>Our words are marked as ours.</strong> Explanations, guides, and editorial notes are AirPermitHub&apos;s own writing and are kept separate from quoted regulatory text.</li>
        <li><strong>Sample content is always labeled.</strong> Demo jobs, permits, and compliance items carry a Demo badge.</li>
      </ul>

      <h2>3. How content is checked</h2>
      <p>Every month, an automated check re-reads each linked government page and the current eCFR and tests whether every quote, threshold, 40 CFR citation, agency name, and link still matches.{checkedOn ? ` The most recent check ran on ${checkedOn}.` : ""} Results, including what failed or could not be read, are published on <Link href="/verification" className={link}>How We Verify</Link>. Each state page shows the date it was last reviewed and its own check results.</p>

      <h2>4. Independence</h2>
      <p>No company, vendor, or agency pays to change what a regulatory page says. If the site ever shows a sponsored listing, paid placement, or a link to a paid service, it will be labeled as such and kept apart from regulatory content.</p>

      <h2 id="report">5. Reporting an error</h2>
      {contactEmail ? (
        <p>Use the &quot;Report an error on this page&quot; link at the bottom of any regulatory or tool page, the <Link href="/contact" className={link}>contact form</Link>, or email <a href={`mailto:${contactEmail}`} className={link}>{contactEmail}</a>. Include the page and, if you can, a link to the official source that shows the correct information.</p>
      ) : (
        <p>A public inbox for error reports is being set up. When it is live, every regulatory and tool page will carry a &quot;Report an error on this page&quot; link. Until then, the monthly source check is how errors are caught.</p>
      )}

      <h2>6. How corrections are made</h2>
      <ul>
        <li>We check the report against the official source before changing anything.</li>
        <li>A correction to a published fact is made on the page and logged below with the date, what changed, and the source.</li>
        <li>If an item cannot be confirmed quickly, it is marked as under review or removed until it can be.</li>
        <li>Fixing a broken link or tidying wording does not change meaning and is not logged.</li>
      </ul>

      <h2 id="corrections">7. Corrections log</h2>
      {correctionLog.length === 0 ? (
        <p>No corrections to published facts have been logged since this policy took effect.</p>
      ) : (
        <ul>
          {correctionLog.map((c) => (
            <li key={c.date + c.page + c.summary}>
              <strong>{c.date}</strong>, <Link href={c.page} className={link}>{c.page}</Link>: {c.summary}{" "}
              <a href={c.source} target="_blank" rel="noopener noreferrer" className={link}>Source</a> <span className="text-muted">({c.foundBy})</span>
            </li>
          ))}
        </ul>
      )}
    </ProsePage>
  );
}
