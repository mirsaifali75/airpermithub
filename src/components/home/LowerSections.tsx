import { ArrowRight, BookOpen, Briefcase, ClipboardList, Factory, GraduationCap, HardHat, MapPin, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/Section";
import { Badge, DemoBadge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { demoJobs } from "@/lib/data/jobs";
import { resourceCategories, resources } from "@/lib/data/resources";

const audiences = [
  { title: "Environmental Engineers", body: "Calculations, applicability screening, and permit research in one workspace.", icon: HardHat },
  { title: "EHS Professionals", body: "Track obligations across sites without rebuilding spreadsheets.", icon: ClipboardList },
  { title: "Air Quality Consultants", body: "Faster first-pass screening and transparent, client-ready methodology.", icon: Users },
  { title: "Facility Operators", body: "Plain-language context for what permits ask of day-to-day operations.", icon: Factory },
  { title: "Compliance Managers", body: "Deadlines, testing, and reporting visibility across facilities.", icon: UserCog },
  { title: "Environmental Students", body: "Learn how real air permitting programs fit together.", icon: GraduationCap },
];

export function Audiences() {
  return (
    <section className="bg-canvas py-16 sm:py-20" aria-labelledby="aud-heading">
      <div className="container-page">
        <SectionHeading id="aud-heading" eyebrow="Who it's for" title="Built for Environmental Professionals" description="AirPermitHub organizes agency websites, federal rules, PDFs, and spreadsheets into one place to start." />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map(({ title, body, icon: Icon }) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const categoryName = (slug: string) => resourceCategories.find((c) => c.slug === slug)?.name ?? slug;

export function LatestResources() {
  return (
    <section className="bg-white py-16 sm:py-20" aria-labelledby="res-heading">
      <div className="container-page">
        <SectionHeading id="res-heading" eyebrow="Resource center" title="Latest Air Permitting Resources" action={{ label: "All resources", href: "/resources" }} description="Our first guides are in production. Each will cite its sources and show a last-reviewed date." />
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {resources.slice(0, 4).map((r) => (
            <li key={r.slug} className="flex flex-col rounded-2xl border border-line bg-canvas/60 p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-brand-600">{categoryName(r.category)}</span>
                <Badge tone="gray">Planned guide</Badge>
              </div>
              <h3 className="mt-3 font-semibold text-ink">{r.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted">{r.excerpt}</p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> ~{r.readMinutes} min read</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function LatestJobs() {
  return (
    <section className="bg-canvas py-16 sm:py-20" aria-labelledby="jobs-heading">
      <div className="container-page">
        <SectionHeading id="jobs-heading" eyebrow="Careers" title="Air Quality Jobs" action={{ label: "Browse all jobs", href: "/jobs" }} description={<>Sample listings preview the job board. <DemoBadge>Demo listings</DemoBadge></>} />
        <ul className="grid gap-3 md:grid-cols-2">
          {demoJobs.slice(0, 4).map((j) => (
            <li key={j.id} className="min-w-0">
              <Link href="/jobs" className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-card transition-colors hover:border-brand-200">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-cyan-400"><Briefcase className="h-5 w-5" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{j.title}</span>
                  <span className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
                    
                    <span>{j.company}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{j.city}, {j.state}</span>
                  </span>
                </span>
                <Badge tone={j.remote ? "green" : "gray"}>{j.remote ? "Remote" : j.type}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-navy-900 py-20 text-white">
      <div aria-hidden="true" className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-eco-500/20 blur-3xl" />
      <div className="container-page relative text-center">
        <h2 className="mx-auto max-w-3xl text-3xl font-extrabold sm:text-5xl">Stop Searching Across Dozens of Websites.</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">Find the air permitting information and tools you need in one place.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/sign-up" className={buttonClass("primary", "lg")}>Get Started Free <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
          <Link href="/permit-finder" className={buttonClass("outline-light", "lg")}>Explore AirPermitHub</Link>
        </div>
      </div>
    </section>
  );
}
