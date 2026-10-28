import type { Metadata } from "next";
import { FileStack } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PermitLibrary, type LibraryItem } from "@/components/permits/PermitLibrary";
import { Disclaimer } from "@/components/ui/Notices";
import { demoPermits } from "@/lib/data/permits";
import { agencyShortName, listStateProfiles } from "@/lib/data/state-profiles";
import { aphTemplates } from "@/lib/data/templates";

export const metadata: Metadata = {
  title: "Permit Library: Permits, Templates, Forms & Checklists",
  description: "Official state air permit forms and application pages, AirPermitHub templates and checklists, and example permit records, searchable by state, industry, and type.",
  alternates: { canonical: "/permits" },
};

const isApplication = (name: string) => /applica|registration|notice of intent|\bnoi\b|claim/i.test(name);

export default function PermitsPage() {
  const states = listStateProfiles();
  const forms: LibraryItem[] = states.flatMap((s) =>
    s.forms.map((f, idx) => ({
      id: `${s.code}-f${idx}`,
      tab: (isApplication(f.name) ? "Applications" : "Forms") as LibraryItem["tab"],
      title: f.name,
      subtitle: `${s.name} · ${s.agency.name}`,
      tags: [agencyShortName(s.agency.name), s.name],
      state: s.code,
      type: isApplication(f.name) ? "Application / registration" : "Forms index",
      href: f.url,
      action: "external" as const,
      kind: "official" as const,
    })),
  );
  const tpl: LibraryItem[] = aphTemplates.map((t) => ({
    id: t.slug,
    tab: t.kind === "checklist" ? "Checklists" : "Templates",
    title: t.title,
    subtitle: t.description,
    tags: ["AirPermitHub Template", ...t.tags],
    type: t.kind === "checklist" ? "Checklist" : "Template",
    href: `/api/v1/templates/${t.slug}`,
    action: "download",
    kind: "aph",
  }));
  const demos: LibraryItem[] = demoPermits.flatMap((p) => [
    {
      id: p.id,
      tab: "Permits" as const,
      title: `${p.permitType}: ${p.facility}`,
      subtitle: `${p.company} · ${p.county}, ${p.state} · ${p.permitNumber}`,
      tags: [p.agency, p.industry, ...p.equipment],
      state: p.state,
      industry: p.industry,
      type: p.permitType,
      action: "none" as const,
      kind: "demo" as const,
    },
    {
      id: `${p.id}-ex`,
      tab: "Examples" as const,
      title: `${p.permitType} – Example`,
      subtitle: `${p.facility} (fictional) · ${p.industry}`,
      tags: [p.permitType, p.industry, p.state],
      state: p.state,
      industry: p.industry,
      type: p.permitType,
      action: "none" as const,
      kind: "demo" as const,
    },
  ]);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Permit Library" }]}
        title="Permit Library"
        icon={<FileStack />}
        scene="tank-farm"
        description="Access permits, templates, forms and example documents. Official forms link to the agency; AirPermitHub templates are labeled as ours; example permits are clearly marked demo."
      />
      <div className="container-page space-y-6 py-10">
        <PermitLibrary items={[...demos, ...tpl, ...forms]} states={states.map((s) => ({ code: s.code, name: s.name }))} />
        <Disclaimer />
      </div>
    </>
  );
}
