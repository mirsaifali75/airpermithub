"use client";

import { Calculator, ChevronDown, FileSearch, Landmark, Menu, Route, Search, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { SearchDialog } from "@/components/search/SearchDialog";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { SearchDoc } from "@/lib/search";
import { primaryNav, resourcesMenu } from "@/lib/site";

const mobilePriority = [
  { label: "Permit Finder", href: "/permit-finder", icon: Route },
  { label: "Calculators", href: "/calculators", icon: Calculator },
  { label: "Regulations", href: "/regulations", icon: Landmark },
  { label: "Compliance", href: "/compliance", icon: ShieldCheck },
  { label: "Permit Library", href: "/permits", icon: FileSearch },
];

export function Header({ searchIndex }: { searchIndex: SearchDoc[] }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setResourcesOpen(false);
        setMobileOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) setResourcesOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setResourcesOpen(false);
  }, [pathname]);

  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const solid = !isHome || scrolled || mobileOpen;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <a href="#main" className="sr-only z-[70] rounded-lg bg-white px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300",
          solid ? "bg-navy-900/92 shadow-[0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-md" : "bg-transparent",
        )}
      >
        <div className="container-page flex h-16 items-center gap-4 lg:h-[4.5rem]">
          <Link href="/" aria-label="AirPermitHub home" className="shrink-0">
            <Logo tone="dark" />
          </Link>

          <nav aria-label="Primary" className="ml-4 hidden flex-1 items-center gap-0.5 xl:flex">
            {primaryNav.filter((n) => n.href !== "/resources").map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-2.5 py-2 text-[0.9rem] font-medium transition-colors",
                  isActive(item.href) ? "text-white" : "text-white/75 hover:text-white",
                )}
              >
                {item.label}
                {isActive(item.href) && <span className="absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full bg-cyan-500" />}
              </Link>
            ))}
            <div ref={resourcesRef} className="relative">
              <button
                onClick={() => setResourcesOpen((o) => !o)}
                aria-expanded={resourcesOpen}
                aria-haspopup="true"
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[0.9rem] font-medium",
                  isActive("/resources") || isActive("/templates") ? "text-white" : "text-white/75 hover:text-white",
                )}
              >
                Resources <ChevronDown className={cn("h-4 w-4 transition-transform", resourcesOpen && "rotate-180")} aria-hidden="true" />
              </button>
              {resourcesOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl border border-line bg-white p-2 shadow-lift">
                  {resourcesMenu.map((r) => (
                    <Link key={r.href} href={r.href} className="block rounded-xl px-3 py-2.5 hover:bg-canvas">
                      <span className="block text-sm font-semibold text-ink">{r.label}</span>
                      <span className="block text-xs text-muted">{r.description}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/85 hover:bg-white/10 hover:text-white"
              aria-label="Search (Ctrl+K)"
            >
              <Search className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/sign-in" className={buttonClass("outline-light", "sm")}>Sign In</Link>
              <Link href="/sign-up" className={buttonClass("primary", "sm")}>Sign Up</Link>
            </div>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/10 xl:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div id="mobile-nav" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 bg-navy-900 xl:hidden">
            <div className="container-page py-4">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setSearchOpen(true);
                }}
                className="mb-4 flex h-12 w-full items-center gap-3 rounded-xl bg-white/10 px-4 text-left text-white/70"
              >
                <Search className="h-5 w-5 text-cyan-400" aria-hidden="true" /> Search permits, regulations, equipment...
              </button>
              <div className="grid grid-cols-2 gap-2">
                {mobilePriority.map(({ label, href, icon: Icon }) => (
                  <Link key={href} href={href} className="glass-dark flex items-center gap-2.5 rounded-xl px-3 py-3.5 text-sm font-semibold text-white">
                    <Icon className="h-5 w-5 text-cyan-400" aria-hidden="true" /> {label}
                  </Link>
                ))}
              </div>
              <nav aria-label="Mobile" className="mt-4 grid grid-cols-2 gap-x-4 border-t border-white/10 pt-4">
                {[...primaryNav.filter((n) => !mobilePriority.some((p) => p.href === n.href)), ...resourcesMenu.slice(1)].map((n) => (
                  <Link key={n.href} href={n.href} className="py-2.5 text-white/80 hover:text-white">
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                <Link href="/sign-in" className={buttonClass("outline-light", "md")}>Sign In</Link>
                <Link href="/sign-up" className={buttonClass("primary", "md")}>Sign Up</Link>
              </div>
            </div>
          </div>
        )}
      </header>
      <SearchDialog index={searchIndex} open={searchOpen} onClose={closeSearch} />
    </>
  );
}
