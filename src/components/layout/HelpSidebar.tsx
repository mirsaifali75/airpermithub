import { ArrowRight, BookOpen, Building2, CircleHelp, Cog, Droplets, Factory, FlaskConical, Fuel, Mountain, Zap } from "lucide-react";
import Link from "next/link";

const byIndustry = [
  { label: "Oil & Gas", href: "/industries/oil-gas", icon: Droplets },
  { label: "Midstream", href: "/industries/midstream", icon: Fuel },
  { label: "Refining", href: "/industries/refining", icon: Factory },
  { label: "Power Generation", href: "/industries/power-generation", icon: Zap },
  { label: "Chemical", href: "/industries/chemical", icon: FlaskConical },
  { label: "Manufacturing", href: "/industries/manufacturing", icon: Building2 },
  { label: "Mining & Aggregates", href: "/industries/aggregates", icon: Mountain },
  { label: "Other Industries", href: "/industries", icon: Cog },
];

const popular = [
  { label: "Which permit do I need?", href: "/resources/where-to-start-air-permit" },
  { label: "Potential to emit, explained", href: "/resources/potential-to-emit-explained" },
  { label: "PSD vs. minor NSR", href: "/resources/psd-vs-minor-nsr" },
  { label: "Title V requirements", href: "/resources/title-v-basics" },
  { label: "State-specific rules", href: "/states" },
];

export function HelpSidebar() {
  return (
    <aside className="no-print space-y-4" aria-label="Help">
      <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-bold text-ink"><CircleHelp className="h-5 w-5 text-brand-500" aria-hidden="true" /> Need Help?</h2>
        <h3 className="mt-4 text-xs font-bold tracking-wider text-muted uppercase">Browse by industry</h3>
        <ul className="mt-2 space-y-0.5">
          {byIndustry.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-canvas hover:text-brand-700">
                <Icon className="h-4 w-4 text-brand-500" aria-hidden="true" /> {label}
              </Link>
            </li>
          ))}
        </ul>
        <h3 className="mt-5 text-xs font-bold tracking-wider text-muted uppercase">Popular guides</h3>
        <ul className="mt-2 space-y-0.5">
          {popular.map(({ label, href }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-canvas hover:text-brand-700">
                <BookOpen className="h-4 w-4 text-brand-500" aria-hidden="true" /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Link href="/calculators" className="group block rounded-2xl bg-navy-900 p-5 text-white shadow-card">
        <p className="text-xs font-bold tracking-[0.18em] text-cyan-400 uppercase">Next step</p>
        <p className="mt-1.5 font-semibold">Calculate potential to emit before drawing conclusions.</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cyan-400">Open calculators <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
      </Link>
    </aside>
  );
}
