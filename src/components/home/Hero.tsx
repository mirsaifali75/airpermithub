import { ArrowRight, BookOpenCheck, Calculator, ClipboardCheck, Factory, Landmark, Search } from "lucide-react";
import Link from "next/link";
import { IndustrialScene } from "@/components/illustrations/IndustrialScene";
import { buttonClass } from "@/components/ui/Button";

const features = [
  { icon: Landmark, title: "Federal & State", sub: "Regulations", href: "/regulations" },
  { icon: Calculator, title: "Emission", sub: "Calculators", href: "/calculators" },
  { icon: BookOpenCheck, title: "Permitting", sub: "Guidance", href: "/permit-finder" },
  { icon: ClipboardCheck, title: "Compliance", sub: "Tools", href: "/compliance" },
  { icon: Factory, title: "Industry", sub: "Resources", href: "/industries" },
];

export function Hero({ stateCount }: { stateCount: number }) {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950 text-white">
      <IndustrialScene className="absolute inset-0 -z-10 h-full w-full" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/85 via-navy-950/35 to-transparent" />
      <div className="container-page pt-28 pb-24 sm:pt-36 sm:pb-28 lg:pt-40 lg:pb-32">
        <div className="max-w-2xl animate-fade-up">
          <p className="text-xs font-bold tracking-[0.28em] text-cyan-400 sm:text-sm">FROM REGULATIONS TO OPERATIONS</p>
          <h1 className="mt-4 text-[2.75rem] leading-[1.02] font-extrabold sm:text-6xl lg:text-7xl">
            Air Permitting
            <br />
            <span className="text-gradient-brand">Made Simple.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/80 sm:text-xl">
            Tools, guidance and resources for environmental professionals to navigate air permitting and compliance with confidence.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/permit-finder" className={buttonClass("primary", "lg", "sm:min-w-60")}>
              <Search className="h-5 w-5" aria-hidden="true" /> Find My Permit Path <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link href="/calculators" className={buttonClass("outline-light", "lg", "border-white/40 sm:min-w-56")}>
              Calculate Emissions <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/60">
            {stateCount >= 51 ? "All 50 states + DC" : `${stateCount} state hubs`} · Federal programs · Official sources linked on every record
          </p>
        </div>

        <ul className="glass-dark mt-12 grid grid-cols-2 overflow-hidden rounded-2xl sm:grid-cols-3 lg:mt-14 lg:grid-cols-5">
          {features.map(({ icon: Icon, title, sub, href }) => (
            <li key={title} className="border-white/10 [&:not(:last-child)]:border-r max-lg:[&:nth-child(n+3)]:border-t">
              <Link href={href} className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-white/5 sm:px-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-brand-500/15 text-cyan-400">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm leading-tight font-semibold">
                  {title}
                  <span className="block font-normal text-white/65">{sub}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
