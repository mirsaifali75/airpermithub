import type { Metadata } from "next";
import { Download, FileSpreadsheet, FolderDown, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer, VerifyNotice } from "@/components/ui/Notices";
import { aphTemplates } from "@/lib/data/templates";

export const metadata: Metadata = {
  title: "Air Permitting Templates & Checklists (Free CSV Downloads)",
  description: "Free AirPermitHub working templates: equipment, engine, and tank inventories, calculation workbook, permit condition tracker, compliance calendar, deviation log, and permitting checklists.",
  alternates: { canonical: "/templates" },
};

export default function TemplatesPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Resources", href: "/resources" }, { label: "Templates" }]} title="Templates & Checklists" icon={<FolderDown />} scene="industrial" description="Working files for permitting and compliance teams. CSV format opens in Excel or Google Sheets." />
      <div className="container-page space-y-6 py-10">
        <VerifyNotice>AirPermitHub templates are our own work products. They are not government-approved forms and contain no regulatory thresholds. Use the agency&apos;s official forms for submittals.</VerifyNotice>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aphTemplates.map((t) => {
            const Icon = t.kind === "checklist" ? ListChecks : FileSpreadsheet;
            return (
              <li key={t.slug} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
                <Icon className="h-7 w-7 text-eco-600" aria-hidden="true" />
                <h2 className="mt-3 font-semibold text-ink">{t.title}</h2>
                <p className="mt-1 flex-1 text-sm text-muted">{t.description}</p>
                <p className="mt-3 text-xs text-muted">{t.rows ? `${t.rows.length} checklist items` : `${t.columns.length} columns`}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <Badge tone="navy">AirPermitHub Template</Badge>
                  <a href={`/api/v1/templates/${t.slug}`} download className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    <Download className="h-4 w-4" aria-hidden="true" /> CSV
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
        <Disclaimer />
      </div>
    </>
  );
}
