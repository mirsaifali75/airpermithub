import type { Metadata } from "next";
import { BookOpen, FolderDown } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Notices";
import { cn } from "@/lib/cn";
import { resourceCategories, resources } from "@/lib/data/resources";

export const metadata: Metadata = {
  title: "Air Permitting Resource Center",
  description: "Guides, checklists, templates, and training on air permitting, emission calculations, and compliance.",
  alternates: { canonical: "/resources" },
};

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const list = category ? resources.filter((r) => r.category === category) : resources;
  const catName = (slug: string) => resourceCategories.find((c) => c.slug === slug)?.name;
  return (
    <>
      <PageHeader crumbs={[{ label: "Resources" }]} eyebrow="Resource center" title="Resources" icon={<BookOpen className="h-7 w-7" />} description="Practical guides for permitting, calculations, and compliance. Every guide will cite its sources and carry a last-reviewed date." />
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Resource categories" className="lg:self-start">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1">
            <li className="shrink-0"><Link href="/resources" className={cn("block rounded-lg px-3 py-2 text-sm", !category ? "bg-white font-semibold text-ink shadow-card" : "text-muted hover:text-ink")}>All</Link></li>
            {resourceCategories.map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link href={c.slug === "templates" ? "/templates" : `/resources?category=${c.slug}`} aria-current={category === c.slug ? "page" : undefined}
                  className={cn("block rounded-lg px-3 py-2 text-sm whitespace-nowrap", category === c.slug ? "bg-white font-semibold text-ink shadow-card" : "text-muted hover:text-ink")}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-6">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
              <h2 className="font-semibold text-ink">{catName(category!) ?? "This category"}: guides in production</h2>
              <p className="mt-1 text-sm text-muted">No published or planned guides are listed here yet.</p>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {list.map((r) => (
                <li key={r.slug} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-brand-600">{catName(r.category)}</span>
                    <Badge tone="gray">Planned guide</Badge>
                  </div>
                  <h2 className="mt-3 font-semibold text-ink">{r.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-muted">{r.excerpt}</p>
                  <p className="mt-4 text-xs text-muted">~{r.readMinutes} min read</p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col items-start gap-4 rounded-2xl bg-navy-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold"><FolderDown className="h-5 w-5 text-cyan-400" aria-hidden="true" /> Engineering templates</h2>
              <p className="text-sm text-white/70">Checklists, inventories, and trackers built for air permitting work.</p>
            </div>
            <Link href="/templates" className={buttonClass("primary")}>Browse templates</Link>
          </div>
          <Disclaimer />
        </div>
      </div>
    </>
  );
}
