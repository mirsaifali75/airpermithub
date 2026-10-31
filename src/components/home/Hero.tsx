import { BookOpenCheck, Calculator, Link2, MapPinned, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/brand/airpermithub-logo.png";
import { IndustrialScene } from "@/components/illustrations/IndustrialScene";

const features = [
  { icon: Link2, title: "Official Source Links", sub: "EPA, eCFR, and state agencies", href: "/regulations" },
  { icon: Calculator, title: "Transparent Calculations", sub: "Every formula and step shown", href: "/calculators" },
  { icon: MapPinned, title: "State-by-State Guidance", sub: "All 50 states + DC", href: "/states" },
  { icon: BookOpenCheck, title: "Practical Resources", sub: "Guides, templates, checklists", href: "/resources" },
];

/** Scopes map to the search page's type filter. */
const scopes = [
  { value: "", label: "All Sources" },
  { value: "Regulation", label: "Regulations" },
  { value: "State", label: "States" },
  { value: "Calculator", label: "Calculators" },
  { value: "Industry", label: "Industries" },
  { value: "Resource", label: "Resources" },
];

/** Each chip opens an existing page; none points at content the site doesn't have. */
const popular = [
  { label: "NSPS 40 CFR 60", href: "/regulations/nsps" },
  { label: "NESHAP 40 CFR 63", href: "/regulations/neshap" },
  { label: "Title V", href: "/regulations/title-v" },
  { label: "Texas PBR", href: "/states/texas" },
  { label: "AP-42", href: "/calculators/ap-42" },
  { label: "PSD", href: "/regulations/psd" },
  { label: "Oil & Gas", href: "/industries/oil-gas" },
];

export function Hero({ stateCount }: { stateCount: number }) {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950 text-white">
      <IndustrialScene className="absolute inset-0 -z-10 h-full w-full" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/85 via-navy-950/35 to-transparent" />
      <div className="container-page pt-40 pb-24 sm:pt-44 sm:pb-28 lg:pt-52 lg:pb-32">
        <div className="flex flex-col gap-8 xl:flex-row-reverse xl:items-center xl:justify-between">
        {/* The official logo at a size where the wordmark and tagline can be read. */}
        <div className="w-full max-w-md shrink-0 animate-fade-up rounded-3xl bg-white p-3 shadow-lift ring-1 ring-black/5 sm:p-4 xl:w-[27.5rem] xl:max-w-none 2xl:w-[31rem]">
          <Image src={logo} alt="AirPermitHub: Nationwide Air Permitting Excellence" priority sizes="(min-width: 1536px) 496px, (min-width: 1280px) 440px, 448px" className="h-auto w-full" />
        </div>
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
        </div>
        </div>

        <form action="/search" role="search" className="mt-8 flex animate-fade-up [animation-delay:120ms] max-w-4xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-lift sm:flex-row sm:items-center">
          <label htmlFor="hero-q" className="sr-only">Search AirPermitHub</label>
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
            <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
            <input id="hero-q" name="q" type="search" required placeholder="Search regulations, permits, equipment, or keywords..." className="h-12 min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-slate-400" />
          </div>
          <div className="flex gap-2">
            <label htmlFor="hero-type" className="sr-only">Search in</label>
            <select id="hero-type" name="type" defaultValue="" className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink sm:w-40 sm:flex-none">
              {scopes.map((s) => <option key={s.label} value={s.value}>{s.label}</option>)}
            </select>
            <button type="submit" className="h-12 shrink-0 rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">Search</button>
          </div>
        </form>
        <div className="mt-4 flex max-w-4xl animate-fade-up flex-wrap items-center gap-2 text-sm [animation-delay:220ms]">
          <span className="font-semibold text-white/80">Popular:</span>
          {popular.map((p) => (
            <Link key={p.label} href={p.href} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/90 transition-colors hover:border-cyan-400/60 hover:bg-white/15">
              {p.label}
            </Link>
          ))}
        </div>
        <p className="mt-4 animate-fade-up text-sm text-white/60 [animation-delay:300ms]">
          {stateCount >= 51 ? "All 50 states + DC" : `${stateCount} state hubs`} · Federal programs · Official sources linked on every record
        </p>

        <ul className="glass-dark mt-10 grid animate-fade-up [animation-delay:380ms] grid-cols-1 overflow-hidden rounded-2xl sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, sub, href }) => (
            <li key={title} className="border-white/10 max-sm:[&:not(:first-child)]:border-t sm:max-lg:[&:nth-child(odd)]:border-r sm:max-lg:[&:nth-child(n+3)]:border-t lg:[&:not(:last-child)]:border-r">
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
