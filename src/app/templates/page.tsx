import type { Metadata } from "next";
import { ArrowRight, Download, FileSpreadsheet, FolderDown, ListChecks, Sheet } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer, VerifyNotice } from "@/components/ui/Notices";
import { aphTemplates } from "@/lib/data/templates";
import { WORKBOOK_VERSION, workbooks } from "@/lib/data/workbooks";

export const metadata: Metadata = {
  title: "Air Permitting Templates & Workbooks (Free Excel and CSV Downloads)",
  description: "Free AirPermitHub Excel workbooks (synthetic minor limits, HAP major source, NSR baseline, oil and gas PTE, deviations, emission inventory, CAM, NSPS/NESHAP matrix) and CSV templates and checklists.",
  alternates: { canonical: "/templates" },
};

export default function TemplatesPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Resources", href: "/resources" }, { label: "Templates" }]} title="Templates & Workbooks" icon={<FolderDown />} scene="industrial" description="Excel workbooks with transparent formulas, and CSV templates and checklists, for permitting and compliance teams." />
      <div className="container-page space-y-6 py-10">
        <section aria-labelledby="workbooks-heading" className="space-y-4">
          <div>
            <h2 id="workbooks-heading" className="text-2xl font-bold text-ink">Engineering workbooks (Excel)</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted">Formula-driven workbooks for the calculations agencies ask to see. Inputs are yellow, formulas are blue, and every formula is written out on its sheet. Thresholds appear only beside the federal rule text they come from, quoted verbatim with an eCFR link. No emission factors are included. Version {WORKBOOK_VERSION}.</p>
          </div>
          <VerifyNotice>These workbooks are engineering aids, not agency forms or regulatory determinations. Federal thresholds and rule text are quoted from the current eCFR and covered by our <Link href="/verification" className="font-semibold underline">monthly source check</Link>; your state&apos;s SIP-approved rules and your permit may differ. Confirm before relying on any result.</VerifyNotice>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workbooks.map((w) => (
              <li key={w.slug} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
                <Sheet className="h-7 w-7 text-brand-600" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-ink">{w.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{w.description}</p>
                <p className="mt-3 text-xs text-muted">Sheets: {w.sheets.join(", ")}</p>
                {w.cites.length > 0 && <p className="mt-1 text-xs text-muted">Quotes: {w.cites.join("; ")}</p>}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  {w.web ? <Link href={w.web.href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">Web version <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link> : <Badge tone="navy">Excel workbook</Badge>}
                  <a href={`/workbooks/${w.file}`} download className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    <Download className="h-4 w-4" aria-hidden="true" /> .xlsx
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <h2 className="pt-6 text-2xl font-bold text-ink">Templates and checklists (CSV)</h2>
        <VerifyNotice>AirPermitHub templates are our own work products. They are not government-approved forms and contain no regulatory thresholds. Use the agency&apos;s official forms for submittals.</VerifyNotice>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aphTemplates.map((t) => {
            const Icon = t.kind === "checklist" ? ListChecks : FileSpreadsheet;
            return (
              <li key={t.slug} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
                <Icon className="h-7 w-7 text-eco-600" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-ink">{t.title}</h3>
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
