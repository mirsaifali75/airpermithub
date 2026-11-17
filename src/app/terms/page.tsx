import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/ProsePage";
import { PolicyDraftNotice } from "@/components/trust/PolicyNotice";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms for using AirPermitHub's reference pages, screening tools, calculators, and templates.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return (
    <ProsePage title="Terms of Use" description="The rules for using this site, in plain language.">
      <PolicyDraftNotice />

      <h2>1. What AirPermitHub is</h2>
      <p>AirPermitHub ({site.domain}) is an educational and compliance-support reference for air permitting. It collects links to official agency sources, quotes from them, and offers screening tools, calculators, and templates. By using the site you agree to these terms.</p>

      <h2>2. Not legal or engineering advice</h2>
      <p>{site.disclaimer}</p>
      <p>Screening results, calculations, and templates are starting points. You are responsible for confirming every requirement against the current regulation, your permit, and the agency with jurisdiction before you rely on it, submit it, or certify it.</p>

      <h2>3. Accuracy and sources</h2>
      <p>We link every regulatory record to its official source and check quotes, thresholds, citations, and links against those sources on a schedule (see <Link href="/verification" className="font-semibold text-brand-600 hover:underline">How We Verify</Link>). Rules change, agency pages move, and a check can miss something. Where our text and the official source differ, the official source controls. Our process for fixing errors is in the <Link href="/editorial-policy" className="font-semibold text-brand-600 hover:underline">Editorial Policy</Link>.</p>

      <h2>4. Your inputs and results</h2>
      <p>Values you type into calculators and tools, such as throughputs, emission factors, and limits, are your own. The site does not supply emission factors or regulatory limits on your behalf. Results depend entirely on those inputs. Where that work is stored is explained in the <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">Privacy Policy</Link>.</p>

      <h2>5. Free accounts</h2>
      <p>The interactive tools need a free account. Keep your password private, use your own real email address or phone number, and tell us if you think someone else has used your account. We may suspend an account that is used to abuse the site. You can delete your account at any time from Account settings.</p>

      <h2>6. Templates and forms</h2>
      <p>AirPermitHub templates and workbooks are not government-approved forms. Use the official agency forms for anything you submit.</p>

      <h2>7. Acceptable use</h2>
      <ul>
        <li>Do not try to break, overload, or get around the security of the site.</li>
        <li>Do not scrape the site in a way that degrades it for others.</li>
        <li>Do not present AirPermitHub content as an agency determination or as your own professional opinion without your own review.</li>
      </ul>

      <h2>8. Content ownership</h2>
      <p>Quoted regulations and agency text belong to the public record or to the agency that published them. The site&apos;s own writing, tools, design, and logo belong to AirPermitHub. You may use tool results and templates in your own work. Please do not republish the site&apos;s own content in bulk without permission.</p>

      <h2>9. Links to other sites</h2>
      <p>We link to agency and other third-party websites. We do not control them and are not responsible for their content or availability.</p>

      <h2>10. No warranty and limit of liability</h2>
      <p>The site is provided &quot;as is&quot; without warranties of any kind. To the extent the law allows, AirPermitHub is not liable for losses that result from relying on the site, including penalties, permit delays, or enforcement actions.</p>

      <h2>11. Changes</h2>
      <p>We may update these terms. The date at the top shows the current version.</p>
    </ProsePage>
  );
}
