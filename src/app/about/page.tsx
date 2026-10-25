import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/ProsePage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About", description: site.description, alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <ProsePage title="About AirPermitHub" eyebrow={site.altMessage} description={site.tagline}>
      <p>Air permitting information is scattered across agency websites, federal regulations, PDFs, permit databases, guidance documents, and spreadsheets. AirPermitHub organizes those workflows into one platform so environmental professionals know where to start.</p>
      <h2>How we handle regulatory information</h2>
      <ul>
        <li>Every regulatory record links to its official source and shows when we last reviewed it.</li>
        <li>We separate official documents, AirPermitHub summaries, and user uploads.</li>
        <li>We do not invent thresholds, emission factors, deadlines, or agency interpretations. Where we cannot verify something, we say so.</li>
        <li>Demo and placeholder content is always labeled.</li>
      </ul>
      <h2>Who it&apos;s for</h2>
      <p>Environmental engineers, EHS professionals, air quality consultants, facility operators, compliance managers, and students.</p>
    </ProsePage>
  );
}
