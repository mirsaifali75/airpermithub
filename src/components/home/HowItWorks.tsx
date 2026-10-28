import { ArrowRight, CalendarClock, Calculator, Route } from "lucide-react";
import Link from "next/link";

const steps = [
  { n: "01", icon: Route, title: "Screen the permit path", body: "Answer five questions about the facility, location, emission sources, and operations. Get the state and federal programs worth reviewing, each with its citation.", href: "/permit-finder", cta: "Open Permit Finder" },
  { n: "02", icon: Calculator, title: "Calculate potential to emit", body: "Run equipment-based calculations that show the formula, the factor you cite, and every intermediate step. Export the calculation set to CSV or PDF.", href: "/calculators", cta: "Open Calculators" },
  { n: "03", icon: CalendarClock, title: "Track what the permit requires", body: "Turn permit conditions into a calendar of testing, monitoring, reporting, and certification tasks across facilities.", href: "/compliance", cta: "Open Compliance Calendar" },
];

export function HowItWorks() {
  return (
    <section className="bg-white py-16 sm:py-20" aria-labelledby="how-heading">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">How it works</p>
          <h2 id="how-heading" className="text-2xl font-bold text-ink sm:text-3xl">From first question to ongoing compliance</h2>
        </div>
        <ol className="mt-10 grid gap-5 lg:grid-cols-3">
          {steps.map(({ n, icon: Icon, title, body, href, cta }) => (
            <li key={n} className="relative flex flex-col rounded-2xl border border-line bg-canvas/60 p-6">
              {/* Decorative step number, drawn with CSS so it isn't read as low-contrast text. */}
              <span aria-hidden="true" data-n={n} className="absolute top-5 right-6 font-display text-4xl font-extrabold text-slate-200 before:content-[attr(data-n)]" />
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-cyan-400"><Icon className="h-6 w-6" aria-hidden="true" /></span>
              <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{body}</p>
              <Link href={href} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">{cta} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
