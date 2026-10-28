import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/ProsePage";
import { VerifyNotice } from "@/components/ui/Notices";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function Page() {
  return (
    <ProsePage title="Privacy Policy">
      <VerifyNotice>Placeholder. The Privacy Policy must be drafted and reviewed by qualified counsel before launch.</VerifyNotice>
      <h2>What the site does today</h2>
      <p>This is a plain description of the site&apos;s current behavior, not a legal policy.</p>
      <ul>
        <li><strong>No accounts.</strong> Sign-in and sign-up forms are not connected. Nothing typed into them is sent or stored.</li>
        <li><strong>Your browser only.</strong> Saved calculations, compliance tasks you add, and saved jobs are kept in your browser&apos;s local storage on your device. AirPermitHub never receives them. Clearing site data removes them.</li>
        <li><strong>Newsletter.</strong> The sign-up box does not store email addresses yet.</li>
        <li><strong>Analytics.</strong> The site uses Vercel Web Analytics and Speed Insights to count page views and measure page speed. They do not set cookies and do not identify individual visitors.</li>
        <li><strong>Hosting logs.</strong> The hosting provider (Vercel) processes standard request data, such as IP address and browser type, to serve and protect the site.</li>
      </ul>
    </ProsePage>
  );
}
