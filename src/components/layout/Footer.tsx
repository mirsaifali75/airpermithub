import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { footerNav, site } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";
import { SocialIcons } from "./SocialIcons";

export function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      <div className="h-1 bg-gradient-brand" aria-hidden="true" />
      <div className="container-page py-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.15fr_2.6fr]">
          <div>
            <Logo tone="dark" className="h-44 p-2" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">{site.description}</p>
            <div className="mt-8 max-w-sm">
              <h2 className="text-sm font-semibold">Stay Updated</h2>
              <p className="mt-1 mb-3 text-sm text-white/70">Get the latest air permitting news and resources.</p>
              <NewsletterForm />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
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
        <p className="mt-12 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/65">{site.disclaimer}</p>
        <div className="mt-6 flex flex-col-reverse gap-4 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AirPermitHub. All rights reserved.</p>
          <SocialIcons />
        </div>
      </div>
    </footer>
  );
}
