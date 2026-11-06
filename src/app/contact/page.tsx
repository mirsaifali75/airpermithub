import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";
import { ProsePage } from "@/components/layout/ProsePage";
import { accountsEnabled } from "@/lib/auth/config";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach AirPermitHub with questions, error reports, partnerships, and job postings.",
  alternates: { canonical: "/contact" },
};

const link = "font-semibold text-brand-600 hover:underline";

export default function ContactPage() {
  return (
    <ProsePage title="Contact" description="Questions, corrections, partnerships, and job postings.">
      {contactEmail ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Mail className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <span>Email <a href={`mailto:${contactEmail}`} className={link}>{contactEmail}</a>{accountsEnabled ? ", or send a message with the form below." : "."}</span>
        </p>
      ) : (
        <p>Our public inbox is being set up and will be listed here once it is confirmed to receive mail.</p>
      )}

      {accountsEnabled && contactEmail && (
        <section aria-labelledby="contact-form" className="rounded-xl border border-line bg-slate-50/60 p-5 sm:p-6">
          <h2 id="contact-form" className="!mt-0">Send a message</h2>
          <p className="mt-1 mb-5 text-sm text-muted">You don&apos;t need an account. Please don&apos;t include confidential facility data or permit application files.</p>
          <ContactForm />
        </section>
      )}

      <h2>Report an error</h2>
      <p>Accuracy matters more than anything else here. Choose &ldquo;Report an error&rdquo; in the form{contactEmail ? <>, or email <a href={`mailto:${contactEmail}?subject=${encodeURIComponent("Error report")}`} className={link}>{contactEmail}</a></> : null}, and include:</p>
      <ul>
        <li>the page, copied from your browser&apos;s address bar;</li>
        <li>what looks wrong, such as a threshold, a deadline, a citation, or a link;</li>
        <li>if you have it, a link to the official agency source that shows the correct information.</li>
      </ul>
      <p>We check every report against the official source before changing anything. See <Link href="/verification" className={link}>How We Verify</Link> for how pages are sourced and checked.</p>

      <h2>Partnerships</h2>
      <p>Tell us who you are and what you have in mind.</p>

      <h2>Job postings</h2>
      <p>The listings on the <Link href="/jobs" className={link}>jobs board</Link> today are sample data. If you&apos;re hiring for an air permitting or compliance role, send us the details.</p>

      <h2>What we can&apos;t help with</h2>
      <ul>
        <li>We can&apos;t decide whether your facility needs a permit or give legal advice by email. For that, contact the agency with jurisdiction or a qualified professional.</li>
        <li>We can&apos;t file, submit, or track permit applications for you.</li>
      </ul>
      <p>Everything on the site is for information and screening only. See the <Link href="/disclaimer" className={link}>disclaimer</Link>.</p>
    </ProsePage>
  );
}
