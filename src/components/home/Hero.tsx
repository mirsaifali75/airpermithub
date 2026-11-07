import { BookOpenCheck, Calculator, Link2, MapPinned, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import heroPhoto from "../../../public/images/industries/oil-and-gas.jpg";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

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
    <section className="bg-canvas pt-6 sm:pt-9">
      {/* Option E, full width (2026-11-07): the photo runs edge to edge with a thin ivory rule inside it; the full logo is in the masthead above. */}
      <div className="relative isolate overflow-hidden bg-navy-950 text-white">
        <Image src={heroPhoto} alt="" priority sizes="100vw" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-navy-950/55" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-3 border border-gold-200/60 sm:inset-[22px]" />
        <div className="relative mx-auto max-w-4xl px-6 pt-16 pb-20 text-center sm:px-10 sm:pt-24 sm:pb-28 lg:pt-28 lg:pb-32">
          <p className="animate-fade-up text-[0.7rem] font-semibold tracking-[0.3em] text-gold-200 uppercase sm:text-[0.8rem]">Nationwide Air Permitting Excellence</p>
          <h1 className="mt-5 animate-fade-up text-[2.6rem] leading-[1.04] font-semibold sm:text-6xl lg:text-[4.6rem]">Air Permitting. Compliance. Simplified.</h1>
          <p className="mx-auto mt-5 max-w-2xl animate-fade-up text-base leading-relaxed text-white/90 sm:text-lg">
            Tools, guidance and resources for environmental professionals to navigate air permitting and compliance with confidence.
          </p>
          <div className="mt-8 flex animate-fade-up flex-col justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className={cn(buttonClass("subtle", "lg"), "border-white")}>Create a free account</Link>
            <Link href="/calculators" className={buttonClass("outline-light", "lg")}>Preview the tools</Link>
            <Link href="/sign-in" className={buttonClass("outline-light", "lg")}>Sign in</Link>
          </div>
        </div>
      </div>

      <div className="container-page">
        <form action="/search" role="search" className="relative z-10 mx-auto -mt-8 flex max-w-3xl animate-fade-up flex-col gap-2 border border-rule bg-white p-2 shadow-[0_12px_30px_rgb(10_30_51/0.12)] [animation-delay:120ms] sm:-mt-9 sm:flex-row sm:items-center sm:gap-0 sm:p-0">
          <label htmlFor="hero-q" className="sr-only">Search AirPermitHub</label>
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-5">
            <Search className="h-5 w-5 shrink-0 text-gold-700" aria-hidden="true" />
            <input id="hero-q" name="q" type="search" required placeholder="Search regulations, permits, equipment or keywords" className="h-12 min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-slate-500 sm:h-16" />
          </div>
          <div className="flex gap-2 sm:gap-0">
            <label htmlFor="hero-type" className="sr-only">Search in</label>
            <select id="hero-type" name="type" defaultValue="" className="h-12 min-w-0 flex-1 border border-rule bg-white px-3 text-sm font-medium text-ink sm:h-16 sm:w-40 sm:flex-none sm:border-y-0 sm:border-r-0">
              {scopes.map((s) => <option key={s.label} value={s.value}>{s.label}</option>)}
            </select>
            <button type="submit" className="h-12 shrink-0 bg-navy-900 px-7 font-semibold tracking-[0.04em] text-white hover:bg-navy-800 sm:h-16 sm:px-8">Search</button>
          </div>
        </form>
        <div className="mx-auto mt-5 flex max-w-4xl animate-fade-up flex-wrap items-center justify-center gap-2 text-sm [animation-delay:220ms]">
          <span className="font-semibold tracking-[0.1em] text-gold-700 uppercase">Popular:</span>
          {popular.map((p) => (
            <Link key={p.label} href={p.href} className="border border-rule bg-white px-3 py-1 text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-700">
              {p.label}
            </Link>
          ))}
        </div>
        <p className="mt-4 animate-fade-up text-center text-sm text-muted [animation-delay:300ms]">
          {stateCount >= 51 ? "All 50 states + DC" : `${stateCount} state hubs`} · Federal programs · Official sources linked on every record
        </p>

        <ul className="mt-10 grid animate-fade-up grid-cols-1 border-y border-rule [animation-delay:380ms] sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, sub, href }) => (
            <li key={title} className="border-rule max-sm:[&:not(:first-child)]:border-t sm:max-lg:[&:nth-child(odd)]:border-r sm:max-lg:[&:nth-child(n+3)]:border-t lg:[&:not(:last-child)]:border-r">
              <Link href={href} className="flex items-center gap-3 px-4 py-5 transition-colors hover:bg-white sm:px-5">
                <Icon className="h-6 w-6 shrink-0 text-gold-700" aria-hidden="true" />
                <span className="text-sm leading-tight font-semibold text-navy-900">
                  {title}
                  <span className="block font-normal text-muted">{sub}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
