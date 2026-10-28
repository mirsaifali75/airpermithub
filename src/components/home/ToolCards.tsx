import { ArrowRight, Briefcase, CalendarCheck, Calculator, FileStack, Landmark, Route } from "lucide-react";
import Link from "next/link";

const tools = [
  { title: "Permit Finder", body: "Find your permit path", href: "/permit-finder", icon: Route },
  { title: "Emission Calculator", body: "Equipment-based, cited methods", href: "/calculators", icon: Calculator },
  { title: "Regulations Library", body: "Federal & state", href: "/regulations", icon: Landmark },
  { title: "Compliance Calendar", body: "Deadlines & reporting", href: "/compliance", icon: CalendarCheck },
  { title: "Templates & Forms", body: "Official forms, checklists", href: "/permits?tab=forms", icon: FileStack },
  { title: "Jobs & Career Hub", body: "Air & environmental roles", href: "/jobs", icon: Briefcase },
];

export function ToolCards() {
  return (
    <section aria-labelledby="tools-heading" className="relative z-10 -mt-14 sm:-mt-16">
      <h2 id="tools-heading" className="sr-only">Core tools</h2>
      <ul className="container-page grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {tools.map(({ title, body, href, icon: Icon }) => (
          <li key={title}>
            <Link
              href={href}
              className="group flex h-full flex-col rounded-2xl border border-line bg-white p-4 shadow-lift transition-all hover:-translate-y-1 hover:border-brand-200 sm:p-5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white shadow-[0_8px_18px_-8px_rgb(20_125_255/0.8)]">
                <Icon className="h-5.5 w-5.5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-[0.95rem] font-bold text-navy-900 sm:text-base">{title}</h3>
              <p className="mt-0.5 flex-1 text-xs text-muted sm:text-sm">{body}</p>
              <ArrowRight className="mt-3 h-4 w-4 text-brand-500 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
