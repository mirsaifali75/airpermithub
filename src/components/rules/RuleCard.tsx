import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ruleCitation, ruleHref, ruleName } from "@/lib/rules";
import type { RuleSummary } from "@/lib/data/ecfr";

export function RuleCard({ rule }: { rule: RuleSummary }) {
  return (
    <Link href={ruleHref(rule)} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition hover:border-brand-300 hover:shadow-lift">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{ruleCitation(rule)}</p>
      <h3 className="mt-1 font-bold text-ink group-hover:text-brand-700">
        {ruleName(rule)}
        {rule.aka.length > 0 && <span className="font-semibold text-muted"> ({rule.aka[0]})</span>}
      </h3>
      <p className="mt-1.5 flex-1 text-sm text-slate-700">{rule.shortHeading}</p>
      <p className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
        <span>{rule.latestAmendment ? `Last amended in eCFR ${rule.latestAmendment}` : "Amendment date not listed"}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-brand-600 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </p>
    </Link>
  );
}
