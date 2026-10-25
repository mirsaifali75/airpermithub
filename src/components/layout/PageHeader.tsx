import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";

/**
 * Dark page banner for inner pages. Keeps the cinematic navy brand at the top
 * while the workspace below stays light and readable.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  crumbs,
  children,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  crumbs: Crumb[];
  children?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-navy-900 pt-24 pb-12 text-white sm:pt-28 sm:pb-14">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div aria-hidden="true" className="absolute -top-40 right-[-10%] h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-48 left-[20%] h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="container-page relative">
        <Breadcrumbs items={crumbs} />
        <div className="mt-6 flex items-start gap-4">
          {icon && <div className="glass-dark hidden rounded-2xl p-3 text-cyan-400 sm:block">{icon}</div>}
          <div className="max-w-3xl">
            {eyebrow && <p className="mb-2 text-xs font-bold tracking-[0.2em] text-eco-500 uppercase">{eyebrow}</p>}
            <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl">{title}</h1>
            {description && <div className="mt-4 text-base text-white/75 sm:text-lg">{description}</div>}
          </div>
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
