import { Building2, Droplets, Factory, FlaskConical, Fuel, HardHat, Landmark, Zap } from "lucide-react";
import Link from "next/link";

/**
 * Who the platform serves, in place of customer logos. AirPermitHub shows
 * company logos only with written permission from that company.
 */
const sectors = [
  { icon: Droplets, name: "Oil & Gas Operators", href: "/industries/oil-gas" },
  { icon: Fuel, name: "Midstream", href: "/industries/midstream" },
  { icon: Factory, name: "Refining", href: "/industries/refining" },
  { icon: Zap, name: "Power Generation", href: "/industries/power-generation" },
  { icon: FlaskConical, name: "Chemical", href: "/industries/chemical" },
  { icon: Building2, name: "Manufacturing", href: "/industries/manufacturing" },
  { icon: HardHat, name: "Environmental Consultants", href: "/tools" },
  { icon: Landmark, name: "Agencies & Academia", href: "/resources" },
];

export function SectorStrip() {
  return (
    <section className="bg-canvas pt-14 pb-4" aria-labelledby="sectors-heading">
      <div className="container-page text-center">
        <h2 id="sectors-heading" className="text-base font-medium text-muted sm:text-lg">
          Built for professionals across the energy, industrial and environmental sectors.
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-8">
          {sectors.map(({ icon: Icon, name, href }) => (
            <li key={name}>
              <Link href={href} className="group flex h-full items-center justify-center gap-2 rounded-xl px-2 py-2 text-slate-500 transition-colors hover:bg-white hover:text-brand-700 hover:shadow-card lg:flex-col lg:gap-1.5">
                <Icon className="h-6 w-6 shrink-0 text-navy-700 transition-colors group-hover:text-brand-600" aria-hidden="true" />
                <span className="text-sm leading-tight font-semibold">{name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
