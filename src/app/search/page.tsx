import type { Metadata } from "next";
import { Search } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/Notices";
import { cn } from "@/lib/cn";
import { listStateProfiles } from "@/lib/data/state-profiles";
import { buildSearchIndex, exampleQueries, search, type SearchKind } from "@/lib/search";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

const kinds: SearchKind[] = ["Regulation", "State", "Industry", "Calculator", "Resource", "Tool"];
const futureFilters = ["Permit", "Agency", "Equipment", "Pollutant", "Document type"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q = "", type } = await searchParams;
  const kind = kinds.find((k) => k === type);
  const index = buildSearchIndex(listStateProfiles());
  const all = q ? search(index, q) : [];
  const results = kind ? all.filter((r) => r.kind === kind) : all;
  const href = (k?: string) => `/search?q=${encodeURIComponent(q)}${k ? `&type=${k}` : ""}`;

  return (
    <>
      <PageHeader crumbs={[{ label: "Search" }]} title={q ? `Results for “${q}”` : "Search AirPermitHub"} icon={<Search className="h-7 w-7" />}>
        <form action="/search" role="search" className="flex max-w-2xl gap-2">
          <label htmlFor="sq" className="sr-only">Search</label>
          <input id="sq" name="q" defaultValue={q} placeholder="Search permits, regulations, equipment, facilities, or keywords..." className="h-12 min-w-0 flex-1 rounded-xl bg-white px-4 text-ink outline-none" />
          <button className="h-12 rounded-xl bg-brand-600 px-5 font-semibold text-white">Search</button>
        </form>
      </PageHeader>
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[14rem_1fr]">
        <aside aria-label="Filter results" className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">Type</p>
            <ul className="flex flex-wrap gap-1 lg:flex-col">
              <li><Link href={href()} className={cn("block rounded-lg px-3 py-1.5 text-sm", !kind ? "bg-white font-semibold shadow-card" : "text-muted")}>All ({all.length})</Link></li>
              {kinds.map((k) => (
                <li key={k}><Link href={href(k)} className={cn("block rounded-lg px-3 py-1.5 text-sm", kind === k ? "bg-white font-semibold shadow-card" : "text-muted")}>{k} ({all.filter((r) => r.kind === k).length})</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">Coming with the database</p>
            <ul className="flex flex-wrap gap-1.5">{futureFilters.map((f) => <li key={f} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">{f}</li>)}</ul>
          </div>
        </aside>
        <div className="min-w-0">
          {!q ? (
            <div className="flex flex-wrap gap-2">{exampleQueries.map((e) => <Link key={e} href={`/search?q=${encodeURIComponent(e)}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm hover:border-brand-200">{e}</Link>)}</div>
          ) : results.length === 0 ? (
            <EmptyState icon={<Search className="h-6 w-6" />} title="No results yet">Search covers AirPermitHub pages only. Permit and document search arrives with the database.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {results.map((r) => (
                <li key={r.href + r.title}>
                  <Link href={r.href} className="block rounded-2xl border border-line bg-white p-5 shadow-card hover:border-brand-200">
                    <span className="text-[0.65rem] font-bold tracking-wide text-brand-600 uppercase">{r.kind}</span>
                    <span className="mt-1 block font-semibold text-ink">{r.title}</span>
                    <span className="mt-1 line-clamp-2 block text-sm text-muted">{r.snippet}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
