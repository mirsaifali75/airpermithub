import { ArrowRight, CalendarCheck, Calculator, ClipboardCheck, FileSearch, FolderDown, Route } from "lucide-react";
import Link from "next/link";

const tools = [
  { title: "Permit Finder", body: "Find your likely permitting path by state, industry, facility type, and equipment.", cta: "Find Permit Path", href: "/permit-finder", icon: Route, tile: "bg-brand-500", glow: "from-brand-500/35" },
  { title: "Emission Calculator", body: "Calculate potential emissions for common industrial equipment and sources.", cta: "Start Calculating", href: "/calculators", icon: Calculator, tile: "bg-eco-600", glow: "from-eco-500/30" },
  { title: "Applicability Checker", body: "Screen potential NSPS, NESHAP, Title V, NSR, PSD, and state requirements.", cta: "Check Applicability", href: "/applicability", icon: ClipboardCheck, tile: "bg-violet-600", glow: "from-violet-500/30" },
  { title: "Permit Search", body: "Research publicly available permits, facilities, and regulatory documents.", cta: "Search Permits", href: "/permits", icon: FileSearch, tile: "bg-amber-500", glow: "from-amber-500/30" },
  { title: "Compliance Calendar", body: "Track testing, reporting, inspections, certifications, and renewal deadlines.", cta: "View Compliance Tools", href: "/compliance", icon: CalendarCheck, tile: "bg-rose-600", glow: "from-rose-500/30" },
  { title: "Resources & Templates", body: "Access forms, checklists, calculation tools, regulatory resources, and engineering templates.", cta: "Browse Resources", href: "/resources", icon: FolderDown, tile: "bg-teal-600", glow: "from-teal-500/30" },
];

export function ToolCards() {
  return (
    <section aria-labelledby="tools-heading" className="relative z-10 -mt-px bg-canvas pt-10 pb-6">
      <h2 id="tools-heading" className="sr-only">Core tools</h2>
      <ul className="container-page grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {tools.map(({ title, body, cta, href, icon: Icon, tile, glow }) => (
          <li key={title}>
            <Link
              href={href}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-navy-900 p-5 text-white shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <div aria-hidden="true" className={`absolute inset-0 bg-gradient-to-br ${glow} via-transparent to-transparent opacity-80`} />
              <Icon aria-hidden="true" className="absolute -right-5 -bottom-5 h-32 w-32 text-white/[0.05] transition-transform duration-500 group-hover:scale-110" />
              <span className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl ${tile} shadow-lg`}>
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="relative mt-4 text-lg font-bold">{title}</h3>
              <p className="relative mt-1.5 flex-1 text-sm leading-relaxed text-white/70">{body}</p>
              <span className="relative mt-4 text-sm font-semibold text-cyan-400">
                {cta} <ArrowRight className="inline h-4 w-4 align-[-3px] transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
