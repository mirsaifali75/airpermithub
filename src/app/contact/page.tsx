import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/ProsePage";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach AirPermitHub with questions, error reports, and partnership requests.",
  alternates: { canonical: "/contact" },
};

const link = "font-semibold text-brand-600 hover:underline";

export default function ContactPage() {
  return (
    <ProsePage title="Contact" description="Questions, error reports, and partnerships.">
      {contactEmail ? (
        <p>Email <a href={`mailto:${contactEmail}`} className={link}>{contactEmail}</a>. A person reads every message.</p>
      ) : (
        <p>Our public inbox is being set up and will be listed here as soon as it is confirmed to receive mail. We would rather show no address than one that bounces.</p>
      )}

      <h2>Report an error</h2>
      <p>Accuracy comes first here. Tell us the page, what looks wrong, and if you can, a link to the official source that shows the correct information. We check every report against that source before changing anything, and corrections to published facts are listed in the <Link href="/editorial-policy#corrections" className={link}>corrections log</Link>.</p>

      <h2>What we can and can&apos;t help with</h2>
      <ul>
        <li>We can fix errors, add missing official sources, and take suggestions for tools and guides.</li>
        <li>We can&apos;t give a permitting determination for your facility by email. For that, contact the agency with jurisdiction or a qualified professional.</li>
      </ul>

      <h2>How we work</h2>
      <p>See <Link href="/editorial-policy" className={link}>Editorial Policy</Link> and <Link href="/verification" className={link}>How We Verify</Link>.</p>
    </ProsePage>
  );
}
