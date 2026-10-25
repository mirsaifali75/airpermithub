import type { Metadata } from "next";
import { FileSearch, FileText, ShieldCheck, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PermitLibrary } from "@/components/permits/PermitLibrary";
import { DemoNotice, Disclaimer } from "@/components/ui/Notices";

export const metadata: Metadata = {
  title: "Air Permit Search & Permit Library",
  description: "Search air permits, facilities, and regulatory documents by company, facility, permit number, location, equipment, and agency.",
  alternates: { canonical: "/permits" },
};

export default function PermitsPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Permit Library" }]} eyebrow="Permit search" title="Permit Library" icon={<FileSearch className="h-7 w-7" />} description="Research publicly available permits, facilities, and regulatory documents. Every record is labeled by where it came from." />
      <div className="container-page space-y-6 py-10">
        <DemoNotice>The permit database launches in Phase 2. These fictional records demonstrate the search and result layout only.</DemoNotice>
        <ul className="grid gap-3 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Official source documents", body: "Retrieved from the issuing agency, linked to the original." , cls: "text-eco-600" },
            { icon: FileText, title: "AirPermitHub summaries", body: "Our plain-language summaries, always linked to the source.", cls: "text-brand-500" },
            { icon: Upload, title: "User-uploaded documents", body: "Shared by users; not verified by AirPermitHub.", cls: "text-slate-500" },
          ].map(({ icon: Icon, title, body, cls }) => (
            <li key={title} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
              <Icon className={`h-5 w-5 shrink-0 ${cls}`} aria-hidden="true" />
              <span><span className="block text-sm font-semibold text-ink">{title}</span><span className="text-xs text-muted">{body}</span></span>
            </li>
          ))}
        </ul>
        <PermitLibrary />
        <Disclaimer />
      </div>
    </>
  );
}
