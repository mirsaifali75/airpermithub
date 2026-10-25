import { FlaskConical, Info, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/lib/site";
import { cn } from "@/lib/cn";

/** Quiet inline disclaimer used on tools and regulatory pages. */
export function Disclaimer({ variant = "general", className }: { variant?: "general" | "screening"; className?: string }) {
  return (
    <p className={cn("flex gap-2 rounded-xl border border-line bg-white/70 px-4 py-3 text-xs leading-relaxed text-muted", className)}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span>
        {variant === "screening" ? site.screeningDisclaimer : site.disclaimer}{" "}
        <Link href="/disclaimer" className="font-medium text-brand-600 underline-offset-2 hover:underline">
          Full disclaimer
        </Link>
      </span>
    </p>
  );
}

/** Flags placeholder / sample data so it is never mistaken for real records. */
export function DemoNotice({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div role="note" className={cn("flex gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900", className)}>
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <strong className="font-semibold">Demo data.</strong>{" "}
        {children ?? "Records on this page are fictional samples used to preview the interface. They are not real facilities, permits, or companies."}
      </div>
    </div>
  );
}

export function VerifyNotice({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div role="note" className={cn("flex gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-navy-800", className)}>
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
      <div>{children ?? "Verify with the official agency source before relying on this information."}</div>
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
      {icon && <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200/70", className)} aria-hidden="true" />;
}
