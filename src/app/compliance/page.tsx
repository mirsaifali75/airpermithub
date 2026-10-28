import type { Metadata } from "next";
import { AlarmClock, CalendarClock, ClipboardCheck, FileClock, FlaskConical, Wrench } from "lucide-react";
import { ComplianceCalendar } from "@/components/compliance/ComplianceCalendar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, ComplianceBadge } from "@/components/ui/Badge";
import { DemoNotice, Disclaimer } from "@/components/ui/Notices";
import { SectionHeading } from "@/components/ui/Section";
import { complianceCategories, demoFacilities, demoTasks } from "@/lib/data/compliance";

export const metadata: Metadata = {
  title: "Air Compliance Calendar & Dashboard",
  description: "Track air permit testing, inspections, reporting, certifications, LDAR, and renewal deadlines across facilities.",
  alternates: { canonical: "/compliance" },
};

export default function CompliancePage() {
  const count = (pred: (t: (typeof demoTasks)[number]) => boolean) => demoTasks.filter(pred).length;
  const cards = [
    { label: "Upcoming Requirements", value: count((t) => t.dueOffsetDays >= 0 && t.status !== "completed"), icon: CalendarClock, tone: "text-brand-500" },
    { label: "Overdue Tasks", value: count((t) => t.status === "overdue"), icon: AlarmClock, tone: "text-red-500" },
    { label: "Permits Expiring", value: 0, icon: FileClock, tone: "text-amber-500" },
    { label: "Testing Due", value: count((t) => t.category === "Testing" && t.status !== "completed"), icon: FlaskConical, tone: "text-violet-500" },
    { label: "Reports Due", value: count((t) => t.category === "Reporting" && t.status !== "completed"), icon: ClipboardCheck, tone: "text-cyan-500" },
    { label: "Open Corrective Actions", value: 0, icon: Wrench, tone: "text-slate-500" },
  ];
  return (
    <>
      <PageHeader crumbs={[{ label: "Compliance" }]} title="Compliance Calendar" icon={<CalendarClock />} scene="midstream" description="Track permitting, reporting and compliance deadlines. Add your own tasks and export them to Outlook, Google, or Apple Calendar." />
      <div className="container-page space-y-12 py-10">
        <ComplianceCalendar />
        <DemoNotice>Demo tasks, facilities, and counts below preview the upcoming compliance workspace and are fictional. Tasks you add yourself stay in your browser.</DemoNotice>

        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {cards.map(({ label, value, icon: Icon, tone }) => (
            <li key={label} className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
              <p className="mt-3 font-display text-3xl font-extrabold text-ink tabular-nums">{value}</p>
              <p className="text-xs font-medium text-muted">{label}</p>
            </li>
          ))}
        </ul>

        <section aria-labelledby="fac">
          <SectionHeading id="fac" title="Facility status" description="Green = On Track · Yellow = Attention · Red = Overdue · Gray = Not Evaluated" />
          <ul className="grid gap-3 md:grid-cols-2">
            {demoFacilities.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
                <div>
                  <p className="font-semibold text-ink">{f.name}</p>
                  <p className="text-xs text-muted">{f.location} · {f.permitStatus} · {f.openTasks} open tasks</p>
                </div>
                <ComplianceBadge status={f.status} />
              </li>
            ))}
          </ul>
        </section>


        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Task categories</h2>
            <ul className="mt-4 flex flex-wrap gap-2">{complianceCategories.map((c) => <li key={c}><Badge tone="blue">{c}</Badge></li>)}</ul>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Reminders</h2>
            <ul className="mt-4 flex flex-wrap gap-2">{["Calendar export (.ics): live", "Email reminders: coming soon", "Dashboard notifications: coming soon"].map((c) => <li key={c}><Badge tone="gray">{c}</Badge></li>)}</ul>
            <p className="mt-3 text-sm text-muted">Deadlines will always come from your permit conditions or the cited rule, never from AirPermitHub assumptions.</p>
          </div>
        </section>
        <Disclaimer />
      </div>
    </>
  );
}
