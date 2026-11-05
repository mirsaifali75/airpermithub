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
    <section className="bg-canvas pt-16 pb-6 sm:pt-20">
      <div className="container-page grid gap-4 lg:grid-cols-[1.9fr_1fr]">
        <div className="rounded-2xl border border-rule bg-white p-5 shadow-card sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h2 className="flex items-center gap-2.5 font-display text-3xl font-semibold text-navy-900"><LayoutGrid className="h-5 w-5 text-gold-700" aria-hidden="true" /> Explore by Industry</h2>
            <Link href="/industries" className="inline-flex items-center gap-1 text-xs font-semibold tracking-[0.12em] whitespace-nowrap text-gold-700 uppercase hover:text-navy-900">
              View All Industries <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {orderedIndustries().slice(0, 8).map((i) => (
              <li key={i.slug}>
                <Link href={`/industries/${i.slug}`} className="group relative block overflow-hidden rounded-xl ring-1 ring-rule transition-all hover:-translate-y-0.5 hover:ring-2 hover:ring-gold-500">
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
                  <span className="block border-t border-rule bg-white px-2 py-2.5 text-center font-display text-lg leading-tight font-semibold text-navy-900 group-hover:text-gold-700">
                    {i.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-rule bg-white p-5 shadow-card sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h2 className="flex items-center gap-2.5 font-display text-3xl font-semibold text-navy-900"><Gavel className="h-5 w-5 text-gold-700" aria-hidden="true" /> Regulations &amp; Guidance</h2>
            <Link href="/regulations" className="inline-flex items-center gap-1 text-xs font-semibold tracking-[0.12em] whitespace-nowrap text-gold-700 uppercase hover:text-navy-900">
              Browse All <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2">
            {regCards.map(({ title, body, href, icon: Icon }) => (
              <li key={title}>
                <Link href={href} className="flex h-full min-w-0 items-start gap-2.5 rounded-xl border border-rule p-3 transition-colors hover:border-gold-500 hover:bg-canvas">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" aria-hidden="true" />
                  <span className="min-w-0 break-words">
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
