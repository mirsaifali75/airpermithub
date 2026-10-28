"use client";

import { BookOpen, Calculator, Home, LayoutDashboard, Route } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Permit Finder", href: "/permit-finder", icon: Route },
  { label: "Calculators", href: "/calculators", icon: Calculator },
  { label: "Resources", href: "/resources", icon: BookOpen },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

/** App-style bottom navigation on phones; hidden from large screens and print. */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Quick navigation" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2 text-[0.65rem] font-semibold", active ? "text-brand-600" : "text-slate-500")}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
