import { ArrowRight, CircleCheck, Clock, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Section";
import flarePhoto from "../../../public/images/site/06-flare.webp";
import stackPhoto from "../../../public/images/site/07-stack-platform.webp";
import monitorPhoto from "../../../public/images/site/08-monitoring-station.webp";
import reviewPhoto from "../../../public/images/site/09-engineer-review.webp";

/** Real screenshots of three tools, taken with each tool's "Load example" data. */
const previews = [
  {
    title: "Emission calculators",
    body: "Every intermediate step on screen, with the emission factor and its source, so a reviewer can check it by hand.",
    image: "/previews/calculator.webp",
    width: 1400,
    height: 853,
    href: "/calculators",
  },
  {
    title: "Permit Finder",
    body: "Five questions about the facility, then the federal and state programs worth reviewing, each with its citation.",
    image: "/previews/permit-finder.webp",
    width: 1400,
    height: 853,
    href: "/permit-finder",
  },
  {
    title: "Compliance calendar",
    body: "Permit conditions turned into dated testing, monitoring, reporting, and certification tasks.",
    image: "/previews/compliance.webp",
    width: 1400,
    height: 853,
    href: "/compliance",
  },
];

export function ProductPreviews() {
  return (
    <section className="bg-white py-16 sm:py-20" aria-labelledby="previews-heading">
      <div className="container-page">
        <SectionHeading
          id="previews-heading"
          eyebrow="Sneak peek"
          title="A first look inside the tools"
          description="Real screenshots with example data. Create a free account to run them on your own facility."
          action={{ label: "All tools", href: "/tools" }}
        />
        <ul className="grid gap-5 lg:grid-cols-3">
          {previews.map((p) => (
            <li key={p.title}>
              <Link href={p.href} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-canvas">
                  <Image src={p.image} alt={`${p.title} with example data`} width={p.width} height={p.height} sizes="(min-width: 1024px) 400px, 100vw" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
                  {/* Trailer: a clear look at the tool, with a lock badge for the full version. */}
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lift">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Full version with a free account
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold text-ink group-hover:text-brand-700">{p.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{p.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                    Open {p.title.toLowerCase()} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const coverage = [
  { title: "Control devices", body: "Flares, enclosed combustors, and destruction efficiency in the emission calculators.", photo: flarePhoto, alt: "Elevated flare stack with ladder and platforms", href: "/calculators/flares", cta: "Flare calculator" },
  { title: "Stack testing", body: "Convert test results between ppm, lb/hr, and lb/MMBtu, with the O2 correction shown.", photo: stackPhoto, alt: "Exhaust stack with yellow access platforms and caged ladder", href: "/tools/ppm-to-lb-hr", cta: "Stack test converters" },
  { title: "Monitoring and reporting", body: "Monitoring, recordkeeping, and reporting tasks tracked against each permit condition.", photo: monitorPhoto, alt: "Air monitoring shelter with weather mast and sampling inlets", href: "/compliance", cta: "Compliance calendar" },
];

export function FieldCoverage() {
  return (
    <section className="bg-canvas py-16 sm:py-20" aria-labelledby="coverage-heading">
      <div className="container-page">
        <SectionHeading id="coverage-heading" eyebrow="In the field" title="From the stack to the report" description="The equipment that drives permit limits, and the tools that do its math." />
        <ul className="grid gap-5 md:grid-cols-3">
          {coverage.map((c) => (
            <li key={c.title}>
              <Link href={c.href} className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl text-white shadow-card ring-1 ring-black/5 md:aspect-[3/4] xl:aspect-[4/5]">
                <Image src={c.photo} alt={c.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="-z-10 object-cover transition-transform duration-700 group-hover:scale-105" />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950/95 via-navy-950/45 to-transparent" />
                <div className="p-5 sm:p-6">
                  <h3 className="text-xl font-bold">{c.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/80">{c.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 group-hover:text-white">
                    {c.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** What a free account includes. Only items that work today are marked Live. */
const workspace = [
  { label: "Permit Finder and applicability screening", live: true },
  { label: "Emission calculators and unit converters", live: true },
  { label: "Practitioner tools: synthetic minor, HAP, rolling 12-month, NSR, CAM", live: true },
  { label: "Federal and state regulation research", live: true },
  { label: "Compliance calendar", live: true },
  { label: "Saved work across devices", live: false },
  { label: "Facility and equipment workspace", live: false },
  { label: "PDF reports", live: false },
];

export function WorkspaceSection() {
  return (
    <section className="bg-white py-16 sm:py-20" aria-labelledby="workspace-heading">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="relative overflow-hidden rounded-2xl shadow-lift ring-1 ring-black/5">
          <Image src={reviewPhoto} alt="Environmental engineer in a field truck reviewing permit records on a laptop" sizes="(min-width: 1024px) 50vw, 100vw" className="h-auto w-full" />
        </div>
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">Your workspace</p>
          <h2 id="workspace-heading" className="text-2xl font-bold text-ink sm:text-3xl">One place for the permit work you do every week</h2>
          <p className="mt-3 text-base text-muted">From the field truck or the office: screen a project, run the numbers, and keep track of what the permit requires.</p>
          <ul className="mt-6 grid gap-2.5">
            {workspace.map((w) => (
              <li key={w.label} className="flex items-start gap-3 text-sm text-slate-700">
                {w.live ? (
                  <CircleCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-eco-500" aria-hidden="true" />
                ) : (
                  <Clock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-slate-400" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">{w.label}</span>
                <span className={w.live ? "shrink-0 rounded-full bg-eco-50 px-2 py-0.5 text-xs font-semibold text-eco-700 ring-1 ring-eco-100" : "shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"}>
                  {w.live ? "Live" : "Coming soon"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className={buttonClass("primary", "md")}>Get started free <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/tools" className={buttonClass("subtle", "md")}>Browse the tools</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
