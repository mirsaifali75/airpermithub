"use client";

import { Calculator, ChevronDown, FileSearch, Landmark, Menu, Route, Search, ShieldCheck, Wrench, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { signOutHere } from "@/app/account/actions";
import fullLogo from "@/assets/brand/airpermithub-logo.png";
import { Logo } from "@/components/brand/Logo";
import { SearchDialog, preloadSearchIndex } from "@/components/search/SearchDialog";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { primaryNav, resourcesMenu } from "@/lib/site";

const mobilePriority = [
  { label: "Permit Finder", href: "/permit-finder", icon: Route },
  { label: "Calculators", href: "/calculators", icon: Calculator },
  { label: "Tools", href: "/tools", icon: Wrench },
  { label: "Regulations", href: "/regulations", icon: Landmark },
  { label: "Compliance", href: "/compliance", icon: ShieldCheck },
  { label: "Permit Library", href: "/permits", icon: FileSearch },
];

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  // True once the masthead has scrolled away and the nav row is pinned to the top.
  const [stuck, setStuck] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const signedIn = useSignedIn(pathname);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const el = headerRef.current;
      setStuck(!!el && window.scrollY > 0 && el.getBoundingClientRect().top <= 0);
    };
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
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const navLink = "relative px-1 py-1 font-display text-[0.95rem] font-semibold tracking-[0.1em] whitespace-nowrap uppercase transition-colors 2xl:text-base";

  return (
    <>
      <a href="#main" className="sr-only z-[70] rounded-lg bg-white px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      {/* Option E masthead: navy utility strip, then the full logo centered on ivory. It scrolls away; the nav row below stays. */}
      <div className="bg-navy-950 text-[0.8rem] text-gold-300 print:hidden">
        <div className="container-page flex items-center justify-between gap-4 py-2">
          <span className="hidden tracking-[0.08em] md:inline">Official EPA, eCFR and state agency sources on every record</span>
          <span className="ml-auto flex items-center gap-5">
            {signedIn ? (
              <>
                <Link href="/account" className="text-gold-200 hover:text-white">My account</Link>
                <Link href="/dashboard" className="font-semibold text-white hover:text-gold-200">Dashboard</Link>
                <SignOutButton className="text-gold-200 hover:text-white" />
              </>
            ) : (
              <>
                <Link href="/sign-in" className="text-gold-200 hover:text-white">Sign in</Link>
                <Link href="/sign-up" className="font-semibold text-white hover:text-gold-200">Create a free account</Link>
              </>
            )}
          </span>
        </div>
      </div>
      <div className="bg-canvas pt-6 text-center sm:pt-8">
        <Link href="/" aria-label="AirPermitHub home" className="inline-block">
          <Image
            src={fullLogo}
            alt="AirPermitHub: Nationwide Air Permitting Excellence"
            priority
            sizes="(min-width: 1024px) 400px, 260px"
            className={cn("mx-auto w-auto", isHome ? "h-32 sm:h-40 lg:h-[12.5rem]" : "h-24 sm:h-28 lg:h-36")}
          />
        </Link>
      </div>
      <header
        ref={headerRef}
        className={cn(
          "sticky top-0 z-50 bg-canvas transition-shadow duration-300",
          stuck && "shadow-[0_6px_18px_-12px_rgb(10_30_51/0.45)]",
        )}
      >
        <div className="container-page">
          <div className="flex h-14 items-center gap-3 border-y-[3px] border-double border-navy-900 lg:h-16">
            <Link
              href="/"
              aria-label="AirPermitHub home"
              tabIndex={stuck ? 0 : -1}
              className={cn("shrink-0 transition-opacity duration-300", stuck ? "opacity-100" : "pointer-events-none opacity-0 xl:w-0 xl:overflow-hidden")}
            >
              <Logo tone="light" className="h-10 lg:h-12" />
            </Link>

            <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-5 xl:flex 2xl:gap-7">
              {primaryNav.filter((n) => n.href !== "/resources").map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(navLink, isActive(item.href) ? "text-gold-700" : "text-navy-900 hover:text-gold-700")}
                >
                  {item.label}
                  {isActive(item.href) && <span className="absolute inset-x-1 -bottom-1 h-px bg-gold-700" />}
                </Link>
              ))}
              <div ref={resourcesRef} className="relative">
                <button
                  onClick={() => setResourcesOpen((o) => !o)}
                  aria-expanded={resourcesOpen}
                  aria-haspopup="true"
                  className={cn(
                    navLink,
                    "inline-flex items-center gap-1",
                    ["/resources", "/templates", "/states", "/applicability", "/regulatory-updates", "/glossary"].some(isActive) ? "text-gold-700" : "text-navy-900 hover:text-gold-700",
                  )}
                >
                  Resources <ChevronDown className={cn("h-4 w-4 transition-transform", resourcesOpen && "rotate-180")} aria-hidden="true" />
                </button>
                {resourcesOpen && (
                  <div className="absolute top-full left-1/2 mt-3 w-72 -translate-x-1/2 border border-rule bg-white p-2 text-left shadow-lift">
                    {resourcesMenu.map((r) => (
                      <Link key={r.href} href={r.href} className="block px-3 py-2.5 hover:bg-canvas">
                        <span className="block text-sm font-semibold text-navy-900">{r.label}</span>
                        <span className="block text-xs text-muted">{r.description}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            <div className="ml-auto flex items-center gap-1.5 xl:ml-0">
              <button
                onClick={() => setSearchOpen(true)}
                onPointerEnter={preloadSearchIndex}
                onFocus={preloadSearchIndex}
                className="inline-flex h-10 w-10 items-center justify-center text-navy-900 hover:text-gold-700"
                aria-label="Search (Ctrl+K)"
              >
                <Search className="h-5 w-5" />
              </button>
              <Link href={signedIn ? "/dashboard" : "/sign-up"} className={cn(buttonClass("primary", "sm"), "hidden sm:inline-flex xl:hidden")}>{signedIn ? "Dashboard" : "Get Started"}</Link>
              <button
                onClick={() => setMobileOpen((o) => !o)}
                className="inline-flex h-10 items-center justify-center gap-2 px-2 font-display text-base font-semibold tracking-[0.1em] text-navy-900 uppercase hover:text-gold-700 xl:hidden"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                <span aria-hidden="true" className="hidden min-[360px]:inline">Menu</span>
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div id="mobile-nav" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-rule bg-canvas xl:hidden">
            <div className="container-page py-4">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setSearchOpen(true);
                }}
                className="mb-4 flex h-12 w-full items-center gap-3 border border-rule bg-white px-4 text-left text-muted"
              >
                <Search className="h-5 w-5 text-gold-700" aria-hidden="true" /> Search permits, regulations, equipment...
              </button>
              <div className="grid grid-cols-2 gap-2">
                {mobilePriority.map(({ label, href, icon: Icon }) => (
                  <Link key={href} href={href} className="flex items-center gap-2.5 border border-rule bg-white px-3 py-3.5 text-sm font-semibold text-navy-900">
                    <Icon className="h-5 w-5 text-gold-700" aria-hidden="true" /> {label}
                  </Link>
                ))}
              </div>
              <nav aria-label="Mobile" className="mt-4 grid grid-cols-2 gap-x-4 border-t border-rule pt-4">
                {[...primaryNav, ...resourcesMenu.slice(1), { label: "Dashboard", href: "/dashboard" }].filter((n) => !mobilePriority.some((p) => p.href === n.href)).map((n) => (
                  <Link key={n.href} href={n.href} className="py-2.5 text-navy-900 hover:text-gold-700">
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-rule pt-4">
                <Link href={signedIn ? "/account" : "/sign-in"} className={buttonClass("subtle", "md")}>{signedIn ? "My Account" : "Sign In"}</Link>
                <Link href={signedIn ? "/dashboard" : "/sign-up"} className={buttonClass("primary", "md")}>{signedIn ? "Dashboard" : "Get Started"}</Link>
                {signedIn && <SignOutButton className={cn(buttonClass("subtle", "md"), "col-span-2")} />}
              </div>
            </div>
          </div>
        )}
      </header>
      <SearchDialog open={searchOpen} onClose={closeSearch} />
    </>
  );
}

/** Signs out here, then reloads the home page so every part of the page sees the change. */
function SignOutButton({ className }: { className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={cn("disabled:opacity-60", className)}
      onClick={() =>
        start(async () => {
          try {
            await signOutHere();
          } finally {
            window.location.assign("/");
          }
        })
      }
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}

/**
 * Whether a visitor is signed in, checked after each navigation so pages stay
 * statically generated. Always false until accounts are open.
 */
function useSignedIn(pathname: string) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ACCOUNTS !== "1") return;
    let live = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => live && setSignedIn(Boolean(s?.user)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pathname]);
  return signedIn;
}
