import { ArrowRight, Calculator, CircleCheck, Landmark, Layers, MapPinned, Search, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { IndustrialScene } from "@/components/illustrations/IndustrialScene";
import { buttonClass } from "@/components/ui/Button";
import { HeroSearch } from "./HeroSearch";

const proofPoints = ["Federal & State Regulations", "Oil & Gas Focused", "Calculators & Tools", "Compliance Resources"];

/** Factual capability statements. Replace with live database counts once real data exists. */
const capabilities = [
  { icon: Landmark, title: "Federal + State", body: "Regulatory resources" },
  { icon: Layers, title: "Multi-Industry", body: "Tools and guidance" },
  { icon: Wrench, title: "Equipment-Based", body: "Transparent calculations" },
  { icon: ShieldCheck, title: "Compliance", body: "Tracking workflows" },
];

export function Hero({ liveStates }: { liveStates: string[] }) {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950 text-white">
      <IndustrialScene className="absolute inset-0 -z-10 h-full w-full" />
      <div className="container-page pt-28 pb-10 sm:pt-36 lg:pt-40">
        <div className="max-w-2xl animate-fade-up">
          <p className="text-xs font-bold tracking-[0.28em] text-eco-500 sm:text-sm">FROM REGULATIONS TO OPERATIONS</p>
          <h1 className="mt-4 text-[2.75rem] leading-[1.02] font-extrabold sm:text-6xl lg:text-7xl">
            Air Permitting
            <br />
            <span className="text-white">Made </span>
            <span className="text-gradient-brand">Simple.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/80 sm:text-xl">
            Your all-in-one platform for air permits, emissions calculations, regulations, compliance tools, and industry resources.
          </p>

          <HeroSearch />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/permit-finder" className={buttonClass("primary", "lg", "sm:min-w-64")}>
              <Search className="h-5 w-5" aria-hidden="true" /> Find My Permit Path <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link href="/calculators" className={buttonClass("outline-light", "lg", "border-cyan-400/50 sm:min-w-56")}>
              <Calculator className="h-5 w-5" aria-hidden="true" /> Calculate Emissions
            </Link>
          </div>

          <ul className="mt-7 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-white/85 sm:flex sm:flex-wrap">
            {proofPoints.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <CircleCheck className="h-4.5 w-4.5 shrink-0 text-eco-500" aria-hidden="true" /> {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 grid gap-3 lg:mt-16 lg:grid-cols-[1fr_minmax(0,22rem)]">
          <ul className="glass-dark grid grid-cols-2 gap-px overflow-hidden rounded-2xl lg:grid-cols-4">
            {capabilities.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-center gap-3 px-4 py-4 sm:px-5">
                <Icon className="h-8 w-8 shrink-0 text-brand-500" aria-hidden="true" />
                <span>
                  <span className="block font-display text-[0.95rem] font-bold whitespace-nowrap sm:text-base">{title}</span>
                  <span className="block text-xs text-white/65 sm:text-sm">{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/states" className="glass-dark group flex items-center gap-4 rounded-2xl border-cyan-400/30 px-5 py-4 hover:border-cyan-400/70">
            <MapPinned className="h-9 w-9 text-cyan-400" aria-hidden="true" />
            <span>
              <span className="block text-[0.65rem] font-semibold tracking-[0.2em] text-white/60">STATE HUBS</span>
              <span className="block font-display text-lg font-bold">
                {liveStates.length >= 51 ? "All 50 states + DC" : liveStates.length <= 2 ? `${liveStates.join(" & ")} live` : `${liveStates.length} state hubs live`}
              </span>
              <span className="block text-xs text-white/65">{liveStates.length >= 51 ? "Agency programs, forms & guidance" : "All 50 states mapped, more in research"}</span>
            </span>
            <ArrowRight className="ml-auto h-5 w-5 text-cyan-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
