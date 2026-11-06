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
    <section className="relative overflow-hidden border-b border-rule bg-canvas pt-8 pb-8 sm:pt-10 sm:pb-10 lg:pt-12 print:pt-4 print:pb-4">
      {scene && (
        <div aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-[40%] lg:block [mask-image:linear-gradient(to_right,transparent,black_45%)]">
          <Scene kind={scene} className="h-full w-full opacity-95" grain={false} />
          <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/30 to-transparent" />
        </div>
      )}
      <div className="container-page relative">
        <Breadcrumbs items={crumbs} tone="light" />
        <div className="mt-5 flex items-start gap-4">
          {icon && (
            <div className="hidden h-13 w-13 shrink-0 items-center justify-center rounded-sm bg-navy-900 text-gold-200 sm:flex [&_svg]:h-6.5 [&_svg]:w-6.5">
              {icon}
            </div>
          )}
          <div className="max-w-3xl">
            {eyebrow && <p className="mb-1.5 text-xs font-semibold tracking-[0.24em] text-gold-700 uppercase">{eyebrow}</p>}
            <h1 className={title.length > 60 ? "text-3xl leading-[1.12] font-semibold text-navy-900 sm:text-4xl" : "text-4xl leading-[1.08] font-semibold text-navy-900 sm:text-5xl"}>{title}</h1>
            {description && <div className="mt-3 text-base text-muted sm:text-lg">{description}</div>}
          </div>
        </div>
        {children && <div className="relative mt-6">{children}</div>}
      </div>
    </section>
  );
}
