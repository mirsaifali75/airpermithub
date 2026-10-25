import type { Metadata } from "next";
import { FileSpreadsheet, FolderDown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer, VerifyNotice } from "@/components/ui/Notices";
import { templates } from "@/lib/data/resources";

export const metadata: Metadata = {
  title: "Air Permitting Templates & Checklists",
  description: "AirPermitHub engineering templates: permit checklists, equipment inventories, calculation workbooks, and compliance trackers.",
  alternates: { canonical: "/templates" },
};

export default function TemplatesPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Resources", href: "/resources" }, { label: "Templates" }]} eyebrow="Downloads" title="Templates" icon={<FolderDown className="h-7 w-7" />} description="Working templates for permitting and compliance teams." />
      <div className="container-page space-y-6 py-10">
        <VerifyNotice>AirPermitHub templates are our own work products. They are not government-approved forms. Use the agency&apos;s official forms for submittals.</VerifyNotice>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <li key={t} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
              <FileSpreadsheet className="h-7 w-7 text-eco-600" aria-hidden="true" />
              <h2 className="mt-3 font-semibold text-ink">{t}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="navy">AirPermitHub Template</Badge>
                <Badge tone="gray">In development</Badge>
              </div>
            </li>
          ))}
        </ul>
        <Disclaimer />
      </div>
    </>
  );
}
