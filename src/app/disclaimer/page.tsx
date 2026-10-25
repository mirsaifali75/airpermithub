import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/ProsePage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Disclaimer", alternates: { canonical: "/disclaimer" } };

export default function DisclaimerPage() {
  return (
    <ProsePage title="Disclaimer">
      <p>{site.disclaimer}</p>
      <h2>Screening tools</h2>
      <p>{site.screeningDisclaimer}</p>
      <h2>Calculations</h2>
      <p>Calculator results depend entirely on the inputs and emission factors you provide. Demo values are illustrative only and must not be used for permitting or compliance.</p>
      <h2>Templates</h2>
      <p>AirPermitHub templates are not government-approved forms. Use the official agency forms for submittals.</p>
    </ProsePage>
  );
}
