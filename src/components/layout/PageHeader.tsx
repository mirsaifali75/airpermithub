import type { ReactNode } from "react";
import { Scene, type SceneKind } from "@/components/illustrations/Scene";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";

/**
 * Light page header for inner pages: breadcrumb, blue icon tile, title, and
 * an optional industrial scene that fades into the page on wide screens.
 * The navy header bar above keeps the brand; the workspace stays bright.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  crumbs,
  children,
  icon,
  scene,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  crumbs: Crumb[];
  children?: ReactNode;
  icon?: ReactNode;
  scene?: SceneKind;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-white pt-24 pb-8 sm:pt-28 sm:pb-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgb(226_232_240/0.6)_1px,transparent_1px),linear-gradient(90deg,rgb(226_232_240/0.6)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <div aria-hidden="true" className="absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
      {scene && (
        <div aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-[40%] lg:block [mask-image:linear-gradient(to_right,transparent,black_45%)]">
          <Scene kind={scene} className="h-full w-full opacity-95" grain={false} />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/30 to-transparent" />
        </div>
      )}
      <div className="container-page relative">
        <Breadcrumbs items={crumbs} tone="light" />
        <div className="mt-5 flex items-start gap-4">
          {icon && (
            <div className="hidden h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-[0_10px_24px_-10px_rgb(20_125_255/0.8)] sm:flex [&_svg]:h-6.5 [&_svg]:w-6.5">
              {icon}
            </div>
          )}
          <div className="max-w-2xl">
            {eyebrow && <p className="mb-1.5 text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">{eyebrow}</p>}
            <h1 className="text-3xl font-extrabold text-navy-900 sm:text-4xl">{title}</h1>
            {description && <div className="mt-3 text-base text-muted sm:text-lg">{description}</div>}
          </div>
        </div>
        {children && <div className="relative mt-6">{children}</div>}
      </div>
    </section>
  );
}
