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
            <li><strong>Accounts.</strong> The interactive tools need a free account; guides, rule pages, and sources don&apos;t. An account stores your email address, your name, your company if you enter one, the account type you choose, whether your email is confirmed, and when you signed up.</li>
            <li><strong>Passwords.</strong> AirPermitHub keeps only an Argon2id hash of your password, never the password itself. When you choose a password, the first five characters of its SHA-1 hash are sent to the Pwned Passwords service (haveibeenpwned.com) to check whether it has appeared in a known data breach. The password itself never leaves the site.</li>
            <li><strong>Google sign-in.</strong> If you use Continue with Google, Google tells AirPermitHub your name, your email address, whether Google has confirmed it, and an ID for your Google account. AirPermitHub doesn&apos;t receive your Google password, contacts, or anything else, and doesn&apos;t store your profile picture.</li>
            <li><strong>Account emails.</strong> Emails are sent through Resend, an email delivery service: a link to confirm your address (it expires after 24 hours), a password reset link (30 minutes), and alerts when your password or two-step login changes or a new browser signs in.</li>
            <li><strong>Two-step login.</strong> If you turn it on, the key your authenticator app uses is stored encrypted, and your backup codes are stored only as hashes.</li>
            <li><strong>Security records.</strong> To stop password guessing, the site counts sign-in, sign-up, and email attempts for up to an hour, keyed to a one-way hash of the email address and of the network address, never the addresses themselves. Records older than a day are cleared as new attempts come in. Account changes such as a new password are noted in an audit log by account ID.</li>
            <li><strong>Cookies.</strong> Signing in sets a session cookie so the site knows it is you; it is removed when you sign out and expires after 30 days. A device cookie holds a random ID for your browser so the site can email you when a browser it hasn&apos;t seen signs in; the site stores a hash of that ID, the browser&apos;s user agent, and when it was first and last used. Google sign-in sets short-lived security cookies while it runs.</li>
            <li><strong>Where it is stored.</strong> Account data is kept in a Postgres database hosted by Neon. You can delete your account at any time from Account settings, which removes it with its sessions, devices, and codes. The audit log keeps a note that an account ID was deleted, without the email address.</li>
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
