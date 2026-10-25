import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { footerNav, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      <div className="h-1 bg-gradient-brand" aria-hidden="true" />
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_3fr]">
          <div>
            <Logo tone="dark" showTagline />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">{site.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
            {footerNav.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="mb-3 text-sm font-semibold text-white">{col.title}</h2>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href} className="text-sm text-white/60 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <p className="mt-12 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/45">{site.disclaimer}</p>
        <div className="mt-6 flex flex-col gap-2 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AirPermitHub. All rights reserved.</p>
          <p className="font-semibold tracking-wide text-white/70">{site.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
