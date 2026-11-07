import Link from "next/link";
import Image from "next/image";
import fullLogo from "@/assets/brand/airpermithub-logo.png";
import { footerNav, site } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";
import { SocialIcons } from "./SocialIcons";

export function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      <div className="h-px bg-gold-300/40" aria-hidden="true" />
      <div className="container-page py-14">
        <div className="grid grid-cols-1 gap-12">
          {/* Brand and newsletter run across the top so the five link columns below get the full width and their labels stay on one line. */}
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
              <Link href="/" aria-label="AirPermitHub home" className="inline-flex w-fit bg-canvas p-3">
                <Image src={fullLogo} alt="AirPermitHub: Nationwide Air Permitting Excellence" sizes="240px" className="h-36 w-auto" />
              </Link>
              <p className="max-w-sm text-sm leading-relaxed text-white/60">{site.description}</p>
            </div>
            <div className="w-full max-w-sm">
              <h2 className="font-display text-xl text-gold-200">Stay Updated</h2>
              <p className="mt-1 mb-3 text-sm text-white/70">Get the latest air permitting news and resources.</p>
              <NewsletterForm />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 border-t border-gold-200/20 pt-10 sm:grid-cols-3 lg:grid-cols-5">
            {footerNav.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="mb-3 font-display text-lg text-gold-200">{col.title}</h2>
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
        <p className="mt-12 max-w-none border-t border-gold-200/20 pt-6 text-xs leading-relaxed text-white/65">
          <span className="block max-w-[120ch]">{site.disclaimer}</span>
        </p>
        <div className="mt-6 flex flex-col-reverse gap-4 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AirPermitHub. All rights reserved.</p>
          <SocialIcons />
        </div>
      </div>
    </footer>
  );
}
