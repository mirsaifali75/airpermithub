import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/ProsePage";
import { PolicyDraftNotice } from "@/components/trust/PolicyNotice";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What AirPermitHub collects (very little), where your tool data is kept, and what our hosting and analytics see.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return (
    <ProsePage title="Privacy Policy" description="What we collect, where your work is kept, and who else sees anything.">
      <PolicyDraftNotice />

      <h2>The short version</h2>
      <ul>
        <li>There are no accounts yet. Nothing you type into a calculator, tool, or form is sent to us.</li>
        <li>Your saved work stays in your own browser.</li>
        <li>We count page views without cookies and without identifying you.</li>
        <li>We do not sell or share personal information, and we do not run advertising trackers.</li>
      </ul>

      <h2>Your tool data stays in your browser</h2>
      <p>Saved calculations, compliance tasks, tracker rows, and saved jobs are kept in your browser&apos;s local storage on your device. AirPermitHub never receives them. Clearing this site&apos;s data in your browser deletes them, so export anything you want to keep (CSV, .ics, or print).</p>

      <h2>Forms that do not send anything yet</h2>
      <p>The newsletter box and the sign-in and sign-up forms are not connected yet. Nothing typed into them is sent or stored.</p>

      <h2>Analytics</h2>
      <p>We use Vercel Web Analytics and Speed Insights to count page views and measure page speed. They do not set cookies and do not identify individual visitors.</p>

      <h2>Hosting</h2>
      <p>The site is hosted by Vercel. Like any web host, Vercel processes standard request data, such as IP address, browser type, and the page requested, to serve the site and protect it from abuse.</p>

      <h2>Official sources and other sites</h2>
      <p>Links to agency and other websites take you to sites with their own privacy practices. The Federal Air Rule Tracker loads data from the Federal Register on our server, so your browser does not contact the Federal Register when you view it.</p>

      <h2>When accounts launch</h2>
      <p>Free accounts are planned so you can keep your work across devices. Before they go live, this policy will be updated to say exactly what an account stores (such as your email address and the work you choose to save), how to export it, and how to delete it. The date at the top will change when that happens.</p>

      <h2>Questions</h2>
      <p>See the <Link href="/contact" className="font-semibold text-brand-600 hover:underline">Contact</Link> page.</p>
    </ProsePage>
  );
}
