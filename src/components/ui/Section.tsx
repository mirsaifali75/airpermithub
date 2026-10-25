import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: { label: string; href: string };
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">{eyebrow}</p>}
        <h2 id={id} className="text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-base text-muted">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
          {action.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function Card({ className, children, as: Tag = "div" }: { className?: string; children: ReactNode; as?: "div" | "article" | "section" | "li" }) {
  return <Tag className={cn("rounded-2xl border border-line bg-white shadow-card", className)}>{children}</Tag>;
}
