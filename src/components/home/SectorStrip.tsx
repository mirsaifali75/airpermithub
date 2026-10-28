import { Building2, Droplets, Factory, FlaskConical, Fuel, HardHat, Landmark, Zap } from "lucide-react";

/**
 * Who the platform serves, in place of customer logos. AirPermitHub shows
 * company logos only with written permission from that company.
 */
const sectors = [
  { icon: Droplets, name: "Oil & Gas Operators" },
  { icon: Fuel, name: "Midstream" },
  { icon: Factory, name: "Refining" },
  { icon: Zap, name: "Power Generation" },
  { icon: FlaskConical, name: "Chemical" },
  { icon: Building2, name: "Manufacturing" },
  { icon: HardHat, name: "Environmental Consultants" },
  { icon: Landmark, name: "Agencies & Academia" },
];

export function SectorStrip() {
  return (
    <section className="bg-canvas pt-14 pb-4" aria-labelledby="sectors-heading">
      <div className="container-page text-center">
        <h2 id="sectors-heading" className="text-base font-medium text-muted sm:text-lg">
          Built for professionals across the energy, industrial and environmental sectors.
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-8">
          {sectors.map(({ icon: Icon, name }) => (
            <li key={name} className="flex items-center justify-center gap-2 text-slate-500 lg:flex-col lg:gap-1.5">
              <Icon className="h-6 w-6 shrink-0 text-navy-700" aria-hidden="true" />
              <span className="text-sm leading-tight font-semibold">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
