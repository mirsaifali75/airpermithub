import { ArrowRight, BarChart3, FileCog, FileText, Gavel, LayoutGrid, MapPinned, Scale } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Scene } from "@/components/illustrations/Scene";
import { industryPhoto, industryScene, orderedIndustries } from "@/lib/data/industries";

const regCards = [
  { title: "NSPS", body: "New Source Performance Standards", href: "/regulations/nsps", icon: FileText },
  { title: "NESHAP", body: "Hazardous Air Pollutants", href: "/regulations/neshap", icon: FileCog },
  { title: "Title V", body: "Operating Permits", href: "/regulations/title-v", icon: Scale },
  { title: "NSR / PSD", body: "Preconstruction review", href: "/regulations/nsr", icon: Gavel },
  { title: "Air Quality Data", body: "AP-42 and emission factors", href: "/regulations/ap-42", icon: BarChart3 },
  { title: "State Resources", body: "TCEQ, NMED, and more", href: "/states", icon: MapPinned },
];

export function IndustriesAndRegulations() {
  return (
    <section className="bg-canvas pt-12 pb-6">
      <div className="container-page grid gap-4 lg:grid-cols-[1.9fr_1fr]">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2.5 text-xl font-bold"><LayoutGrid className="h-5 w-5 text-navy-800" aria-hidden="true" /> Explore by Industry</h2>
            <Link href="/industries" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              View All Industries <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {orderedIndustries().slice(0, 8).map((i) => (
              <li key={i.slug}>
                <Link href={`/industries/${i.slug}`} className="group relative block overflow-hidden rounded-xl ring-1 ring-line transition-all hover:-translate-y-0.5 hover:ring-2 hover:ring-brand-500">
                  {industryPhoto[i.slug] ? (
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={industryPhoto[i.slug]}
                        alt=""
                        fill
                        sizes="(min-width: 1536px) 220px, (min-width: 1024px) 18vw, (min-width: 640px) 24vw, 48vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <Scene kind={industryScene[i.slug]} grain={false} className="aspect-[4/3] h-full w-full transition-transform duration-500 group-hover:scale-105" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/95 to-transparent px-2 pt-8 pb-2.5 text-center text-sm font-semibold text-white">
                    {i.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2.5 text-xl font-bold"><Gavel className="h-5 w-5 text-navy-800" aria-hidden="true" /> Regulations &amp; Guidance</h2>
            <Link href="/regulations" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              Browse All <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2 2xl:grid-cols-3">
            {regCards.map(({ title, body, href, icon: Icon }) => (
              <li key={title}>
                <Link href={href} className="flex h-full items-start gap-2.5 rounded-xl border border-line p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/60">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{title}</span>
                    <span className="block text-xs text-muted">{body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
