import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/ProsePage";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <ProsePage title="Contact" description="Questions, corrections, partnerships, and job postings.">
      <p>A contact form and support inbox launch with accounts in Phase 2.</p>
      <h2>Report an error</h2>
      <p>Accuracy matters more than anything else here. Error reports will be routed to the admin review queue and tracked until resolved.</p>
    </ProsePage>
  );
}
