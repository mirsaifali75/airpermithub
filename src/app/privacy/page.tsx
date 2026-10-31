import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/ProsePage";
import { VerifyNotice } from "@/components/ui/Notices";
import { accountsEnabled } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function Page() {
  return (
    <ProsePage title="Privacy Policy">
      <VerifyNotice>Placeholder. The Privacy Policy must be drafted and reviewed by qualified counsel before launch.</VerifyNotice>
      <h2>What the site does today</h2>
      <p>This is a plain description of the site&apos;s current behavior, not a legal policy.</p>
      <ul>
        {accountsEnabled ? (
          <>
            <li><strong>Accounts are optional.</strong> Every tool works without one. If you create an account, AirPermitHub stores your email address, the name and account type you enter, and when you signed up.</li>
            <li><strong>Sign-in emails.</strong> Sign-in uses a one-time link sent to your email through Resend, an email delivery service. The link expires after 15 minutes. There are no passwords.</li>
            <li><strong>Sign-in cookies.</strong> Signing in sets a session cookie so the site knows it is you; it is removed when you sign out and expires after 30 days. The sign-in form also sets short-lived security cookies that protect the form from forgery.</li>
            <li><strong>Where it is stored.</strong> Account data is kept in a Postgres database hosted by Neon. You can delete your account and its data at any time from your account page.</li>
          </>
        ) : (
          <li><strong>No accounts.</strong> Sign-in and sign-up forms are not connected. Nothing typed into them is sent or stored.</li>
        )}
        <li><strong>Your browser only.</strong> Until account sync is added, saved calculations, compliance tasks you add, and saved jobs are kept in your browser&apos;s local storage on your device. AirPermitHub never receives them. Clearing site data removes them.</li>
        <li><strong>Newsletter.</strong> The sign-up box does not store email addresses yet.</li>
        <li><strong>Analytics.</strong> The site uses Vercel Web Analytics and Speed Insights to count page views and measure page speed. They do not set cookies and do not identify individual visitors.</li>
        <li><strong>Hosting logs.</strong> The hosting provider (Vercel) processes standard request data, such as IP address and browser type, to serve and protect the site.</li>
      </ul>
    </ProsePage>
  );
}
