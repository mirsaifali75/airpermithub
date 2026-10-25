import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/** Native details/summary accordion: keyboard and screen-reader friendly with no JS. */
export function AccordionItem({ title, meta, children, defaultOpen }: { title: ReactNode; meta?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group border-b border-line last:border-b-0" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-ink">{title}</span>
        <span className="flex items-center gap-3">
          {meta}
          <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="px-5 pb-5 text-sm leading-relaxed text-slate-700">{children}</div>
    </details>
  );
}
