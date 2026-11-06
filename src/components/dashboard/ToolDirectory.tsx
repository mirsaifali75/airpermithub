import {
  BookOpenText, Building2, Calculator, CalendarClock, ClipboardList, FileBarChart, FileSearch, FolderKanban, Landmark, Map, Newspaper, Settings, Wrench,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/Badge";
import { accountsEnabled } from "@/lib/auth/config";

/**
 * Every area MIR listed for the signed-in dashboard. "Live" means the page
 * works today; "Coming soon" ones show no link until they do.
 */
export const dashboardTools: { title: string; text: string; href?: string; icon: ComponentType<{ className?: string }> }[] = [
  { title: "Permit Finder", text: "Screen which air permit path a project may need, with citations.", href: "/permit-finder", icon: FileSearch },
  { title: "Emissions Calculators", text: "Engines, heaters, flares, tanks, and more, with every formula shown.", href: "/calculators", icon: Calculator },
  { title: "Emissions Inventory Builder", text: "Build a facility inventory unit by unit and export it.", href: "/tools/emission-inventory", icon: ClipboardList },
  { title: "Practitioner Tools", text: "Synthetic minor limits, HAP tracking, rolling 12-month totals, NSR baselines, CAM.", href: "/tools", icon: Wrench },
  { title: "EPA Regulations Explorer", text: "NSPS, NESHAP, Title V, NSR, and PSD, with the federal rule library.", href: "/regulations", icon: Landmark },
  { title: "State Regulations and Permitting", text: "Permit programs and agencies for all 50 states and DC.", href: "/states", icon: Map },
  { title: "Permit Library", text: "Permit types, forms, and templates in one place.", href: "/permits", icon: BookOpenText },
  { title: "Compliance Calendar", text: "Deadlines and reminders, exportable to your calendar.", href: "/compliance", icon: CalendarClock },
  { title: "Regulatory Updates", text: "Recent federal rule changes that affect air permits.", href: "/regulatory-updates", icon: Newspaper },
  { title: "Facility Workspace", text: "Facilities, equipment lists, and permit limits in one record.", icon: Building2 },
  accountsEnabled
    ? { title: "Saved Calculations and Work", text: "Calculations, compliance tasks, tool entries, and saved jobs, kept in your account on any device.", href: "#saved-work", icon: FolderKanban }
    : { title: "Saved Projects and Calculations", text: "Your work saved to your account and available on any device.", icon: FolderKanban },
  { title: "Reports and Documents", text: "PDF reports and documents built from your saved work.", icon: FileBarChart },
  { title: "Account Settings", text: "Profile, password, Google, two-step login, and sign-out.", href: "/account", icon: Settings },
];

export function ToolDirectory() {
  return (
    <section aria-labelledby="tools-heading">
      <h2 id="tools-heading" className="mb-3 font-bold text-ink">Your tools</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardTools.map(({ title, text, href, icon: Icon }) => {
          const body = (
            <>
              <span className="flex items-start justify-between gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${href ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-500"}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                {href ? <Badge tone="green">Live</Badge> : <Badge tone="gray">Coming soon</Badge>}
              </span>
              <span className="mt-3 block font-semibold text-ink">{title}</span>
              <span className="mt-1 block text-sm text-muted">{text}</span>
            </>
          );
          return (
            <li key={title}>
              {href
                ? <Link href={href} className="block h-full rounded-2xl border border-line bg-white p-4 shadow-card transition-colors hover:border-brand-200">{body}</Link>
                : <div className="h-full rounded-2xl border border-dashed border-line bg-white/60 p-4" aria-disabled="true">{body}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
