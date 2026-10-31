import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { ComplianceCalendar } from "@/components/compliance/ComplianceCalendar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { DemoNotice, Disclaimer } from "@/components/ui/Notices";
import { complianceCategories } from "@/lib/data/compliance";

export const metadata: Metadata = {
  title: "Air Compliance Calendar & Dashboard",
  description: "Track air permit testing, inspections, reporting, certifications, LDAR, and renewal deadlines across facilities.",
  alternates: { canonical: "/compliance" },
};

export default function CompliancePage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Compliance" }]} title="Compliance Calendar" icon={<CalendarClock />} scene="midstream" description="Track permitting, reporting and compliance deadlines. Add your own tasks with repeats and reminders, and export them to Outlook, Google, or Apple Calendar." />
      <div className="container-page space-y-12 py-10">
        <ComplianceCalendar />
        <DemoNotice>Example tasks are fictional and labeled Demo. They show only until you add your own, are never counted in your totals, and are never exported. Tasks you add stay in your browser.</DemoNotice>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Task categories</h2>
            <ul className="mt-4 flex flex-wrap gap-2">{complianceCategories.map((c) => <li key={c}><Badge tone="blue">{c}</Badge></li>)}</ul>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Reminders</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {[{ t: "Calendar export (.ics) with repeats and reminders: live", tone: "green" as const }, { t: "Task list export (CSV): live", tone: "green" as const }, { t: "Email reminders: coming soon", tone: "gray" as const }].map((c) => <li key={c.t}><Badge tone={c.tone}>{c.t}</Badge></li>)}
            </ul>
            <p className="mt-3 text-sm text-muted">Deadlines always come from your permit conditions or the cited rule, never from AirPermitHub assumptions. Record the basis on each task so the calendar entry carries it.</p>
          </div>
        </section>
        <Disclaimer />
      </div>
    </>
  );
}
