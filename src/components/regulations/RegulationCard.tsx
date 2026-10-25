import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CitationBadge, ContentStatusBadge } from "@/components/ui/Badge";
import type { Regulation } from "@/lib/data/types";

export function RegulationCard({ reg }: { reg: Regulation }) {
  return (
    <Link href={`/regulations/${reg.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-2xl font-extrabold text-navy-900">{reg.shortName}</span>
        <ContentStatusBadge status={reg.status} />
      </div>
      <h3 className="mt-1 font-semibold text-ink">{reg.name}</h3>
      <p className="mt-1.5 flex-1 text-sm text-muted">{reg.tagline}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <CitationBadge>{reg.citation}</CitationBadge>
        <ArrowRight className="h-4 w-4 shrink-0 text-brand-500 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </div>
    </Link>
  );
}
