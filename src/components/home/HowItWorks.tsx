import { ArrowRight, CalendarClock, Calculator, Route } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import stationPhoto from "../../../public/images/site/03-compressor-station.webp";

const steps = [
  { n: "01", icon: Route, title: "Screen the permit path", body: "Answer five questions about the facility, location, emission sources, and operations. Get the state and federal programs worth reviewing, each with its citation.", href: "/permit-finder", cta: "Open Permit Finder" },
  { n: "02", icon: Calculator, title: "Calculate potential to emit", body: "Run equipment-based calculations that show the formula, the factor you cite, and every intermediate step. Export the calculation set to CSV or PDF.", href: "/calculators", cta: "Open Calculators" },
  { n: "03", icon: CalendarClock, title: "Track what the permit requires", body: "Turn permit conditions into a calendar of testing, monitoring, reporting, and certification tasks across facilities.", href: "/compliance", cta: "Open Compliance Calendar" },
];

export function HowItWorks() {
  return (
    <section className="bg-white py-16 sm:py-20" aria-labelledby="how-heading">
      <div className="container-page">
        <div className="grid items-start gap-10 lg:grid-cols-[5fr_7fr] lg:gap-14">
          <div className="lg:sticky lg:top-24">
            <p className="mb-2 text-xs font-semibold tracking-[0.24em] text-gold-700 uppercase">How it works</p>
            <h2 id="how-heading" className="text-3xl font-semibold text-navy-900 sm:text-[2.6rem] sm:leading-[1.1]">From first question to ongoing compliance</h2>
            <div className="mt-6 overflow-hidden rounded-2xl shadow-lift ring-1 ring-black/5">
              <Image src={stationPhoto} alt="Compressor station with engine exhaust stacks and access platforms" sizes="(min-width: 1024px) 40vw, 100vw" className="h-auto w-full" />
            </div>
          </div>
          <ol className="grid gap-4">
            {steps.map(({ n, icon: Icon, title, body, href, cta }) => (
              <li key={n} className="relative flex gap-5 rounded-2xl border border-rule bg-canvas/60 p-5 sm:p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-navy-900 text-gold-200"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tracking-[0.2em] text-gold-700">STEP {n}</p>
                  <h3 className="mt-1 text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
                  <Link href={href} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700 hover:text-navy-900">{cta} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
