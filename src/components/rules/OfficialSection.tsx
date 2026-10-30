import { ExternalLink } from "lucide-react";
import { ecfrSectionUrl, paragraphLevels, type EcfrQuote } from "@/lib/rules";

const indent = ["", "ml-3 sm:ml-5", "ml-6 sm:ml-10", "ml-9 sm:ml-14"];

/** One eCFR section quoted in full. Long sections show their opening paragraphs and fold the rest. */
export function OfficialSection({ q, preview = 8 }: { q: EcfrQuote; preview?: number }) {
  const levels = paragraphLevels(q.paragraphs);
  const items = q.paragraphs.map((p, i) => (
    <p key={i} className={indent[Math.min(levels[i], 3)]}>{p}</p>
  ));
  const shown = items.length > preview + 2 ? items.slice(0, preview) : items;
  const rest = items.slice(shown.length);
  return (
    <section id={`text-${q.id}`} className="scroll-mt-24 overflow-hidden rounded-xl border border-line">
      <div className="flex flex-col gap-1 border-b border-line bg-canvas px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h3 className="font-semibold text-ink">§ {q.id} {q.heading}</h3>
        <a href={ecfrSectionUrl(q.id)} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
          Open in eCFR <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
      <blockquote cite={ecfrSectionUrl(q.id)} className="space-y-2.5 px-4 py-4 text-sm leading-relaxed text-slate-800 [overflow-wrap:anywhere]">
        {shown}
        {rest.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none font-semibold text-brand-700 hover:underline [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Show the rest of § {q.id} ({rest.length} more paragraphs)</span>
              <span className="hidden group-open:inline">Hide the rest of § {q.id}</span>
            </summary>
            <div className="mt-2.5 space-y-2.5">{rest}</div>
          </details>
        )}
      </blockquote>
      {q.cita && <p className="border-t border-line px-4 py-2 text-xs text-muted">{q.cita}</p>}
    </section>
  );
}
