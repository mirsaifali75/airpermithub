import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/ProsePage";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <ProsePage title="Contact" description="Questions, corrections, partnerships, and job postings.">
      <p>
        Have an air permitting question? Use the <Link href="/ask" className="font-semibold text-brand-700 hover:underline">Ask a Question</Link> page. It
        builds an email with the details that make a question answerable, and opens it in your own email app.
      </p>
      <h2>Report an error</h2>
      <p>
        Accuracy matters more than anything else here. To report an error, choose{" "}
        <Link href="/ask?topic=correction" className="font-semibold text-brand-700 hover:underline">Something on this site is wrong</Link> on the Ask page,
        or use the &ldquo;Report an error on this page&rdquo; link on any state, regulation, guide, or tool page. Include the correct information and a
        link to the agency source. Corrections are checked against the official source before the page changes.
      </p>
      <h2>Partnerships and job postings</h2>
      <p>Use the Ask page with the topic &ldquo;Something else&rdquo; for now. A dedicated form launches with accounts.</p>
    </ProsePage>
  );
}
