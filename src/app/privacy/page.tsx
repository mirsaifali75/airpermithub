import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/ProsePage";
import Link from "next/link";
import { PolicyDraftNotice } from "@/components/trust/PolicyNotice";
import { accountsEnabled } from "@/lib/auth/config";
import { phoneEnabled } from "@/lib/auth/sms";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What AirPermitHub stores, where your saved work is kept, and what our hosting, email, and analytics providers see.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  const phone = accountsEnabled && phoneEnabled();
  return (
    <ProsePage title="Privacy Policy" description="What we store, where your work is kept, and who else sees anything.">
      <PolicyDraftNotice />
      <h2>The short version</h2>
      <ul>
        <li>We collect only what the site needs to work{accountsEnabled ? ", and you can delete your account at any time" : ""}.</li>
        <li>We do not sell or share personal information, and we do not run advertising trackers.</li>
        <li>We count page views without cookies and without identifying you.</li>
      </ul>
      <h2>What the site does today</h2>
      <ul>
        {accountsEnabled ? (
          <>
            <li><strong>Accounts.</strong> The interactive tools need a free account; guides, rule pages, and sources don&apos;t. An account stores your email address{phone ? " (or, if you sign up with a phone number, that number)" : ""}, your name, your company if you enter one, the account type you choose, whether your email{phone ? " or number" : ""} is confirmed, and when you signed up.</li>
            <li><strong>Passwords.</strong> AirPermitHub keeps only an Argon2id hash of your password, never the password itself. When you choose a password, the first five characters of its SHA-1 hash are sent to the Pwned Passwords service (haveibeenpwned.com) to check whether it has appeared in a known data breach. The password itself never leaves the site.</li>
            <li><strong>Google sign-in.</strong> If you use Continue with Google, Google tells AirPermitHub your name, your email address, whether Google has confirmed it, and an ID for your Google account. AirPermitHub doesn&apos;t receive your Google password, contacts, or anything else, and doesn&apos;t store your profile picture.</li>
            <li><strong>Account emails.</strong> Emails are sent through Resend, an email delivery service: a link to confirm your address (it expires after 24 hours), a password reset link (30 minutes), a link to confirm a new address when you change your email (24 hours) with a notice to the old address, and alerts when your password or two-step login changes or a new browser signs in.</li>
            {phone && (
              <li><strong>Phone numbers and texts.</strong> If you sign up with a phone number, the codes that confirm it and reset your password are texted through Twilio Verify, which receives your number to send them. Twilio makes and checks each code; AirPermitHub doesn&apos;t store it. The number is used only to sign you in and reset your password, never for marketing texts. Accounts made with a phone number get no emails, including new-browser alerts. Message and data rates may apply.</li>
            )}
            <li><strong>Contact form.</strong> What you type into the contact form (the topic, your name if you give it, your email address, any links, and your message) is emailed through Resend to the AirPermitHub inbox, contact@airpermithub.com, so we can reply. The site doesn&apos;t keep a copy of the message.</li>
            <li><strong>Two-step login.</strong> If you turn it on, the key your authenticator app uses is stored encrypted, and your backup codes are stored only as hashes.</li>
            <li><strong>Security records.</strong> To stop password guessing, the site counts sign-in, sign-up, email{phone ? ", text" : ""}, and contact form attempts for up to a day, keyed to a one-way hash of the email address{phone ? " or phone number" : ""} and of the network address, never the addresses themselves. Records older than a day are cleared as new attempts come in. Account changes such as a new password are noted in an audit log by account ID.</li>
            <li><strong>Cookies.</strong> Signing in sets a session cookie so the site knows it is you; it is removed when you sign out and expires after 30 days. A device cookie holds a random ID for your browser so the site can email you when a browser it hasn&apos;t seen signs in; the site stores a hash of that ID, the browser&apos;s user agent, and when it was first and last used. Google sign-in sets short-lived security cookies while it runs.</li>
            <li><strong>Where it is stored.</strong> Account data is kept in a Postgres database hosted by Neon. You can delete your account at any time from Account settings, which removes it with its sessions, devices, and codes. The audit log keeps a note that an account ID was deleted, without the email address.</li>
          </>
        ) : (
          <li><strong>No accounts.</strong> Sign-in and sign-up forms are not connected. Nothing typed into them is sent or stored.</li>
        )}
        {accountsEnabled ? (
          <li><strong>Saved work.</strong> What you save in the tools (calculations, emission factors, compliance tasks, tool entries, and saved jobs) is kept in your browser&apos;s local storage and, while you&apos;re signed in, in your account, so it&apos;s there on any device. Work saved while signed out joins your account the first time you sign in on that browser. When you sign out, your account&apos;s work is removed from that browser. Deleting your account deletes it.</li>
        ) : (
          <li><strong>Your browser only.</strong> Saved calculations, compliance tasks you add, and saved jobs are kept in your browser&apos;s local storage on your device. AirPermitHub never receives them. Clearing site data removes them.</li>
        )}
        <li><strong>Newsletter.</strong> The sign-up box does not store email addresses yet.</li>
        <li><strong>Analytics.</strong> The site uses Vercel Web Analytics and Speed Insights to count page views and measure page speed. They do not set cookies and do not identify individual visitors.</li>
        <li><strong>Hosting logs.</strong> The hosting provider (Vercel) processes standard request data, such as IP address and browser type, to serve and protect the site.</li>
      </ul>
      <h2>Official sources and other sites</h2>
      <p>Links to agency and other websites take you to sites with their own privacy practices. The Federal Air Rule Tracker loads data from the Federal Register on our server, so your browser does not contact the Federal Register when you view it.</p>
      <h2>Changes</h2>
      <p>This page is updated whenever the site starts storing something new, and the date at the top changes with it.</p>
      <h2>Questions</h2>
      <p>See the <Link href="/contact" className="font-semibold text-brand-600 hover:underline">Contact</Link> page.</p>
    </ProsePage>
  );
}
