"use client";

import { CalendarPlus, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { ComplianceBadge, DemoBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { complianceCategories, demoTasks } from "@/lib/data/compliance";
import type { ComplianceStatus } from "@/lib/data/types";

type Category = (typeof complianceCategories)[number];
interface CalTask { id: string; title: string; facility: string; category: Category; due: Date; status: ComplianceStatus; demo: boolean }
interface StoredTask { id: string; title: string; facility: string; category: Category; date: string }

const STORE = "aph.compliance.tasks.v1";

const bar: Record<Category, string> = {
  Testing: "bg-violet-500",
  Inspection: "bg-teal-500",
  Reporting: "bg-brand-500",
  Certification: "bg-eco-600",
  "Permit Renewal": "bg-orange-500",
  Monitoring: "bg-cyan-500",
  Recordkeeping: "bg-slate-500",
  LDAR: "bg-rose-500",
  "Emission Inventory": "bg-amber-500",
  "Deviation Reporting": "bg-red-600",
};

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

function statusFor(due: Date, today: Date): ComplianceStatus {
  const days = (+due - +today) / 86400000;
  return days < 0 ? "overdue" : days <= 14 ? "due-soon" : "on-track";
}

function toIcs(tasks: CalTask[]) {
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AirPermitHub//Compliance Calendar//EN", "CALSCALE:GREGORIAN"];
  for (const t of tasks) {
    const d = ymd(t.due).replace(/-/g, "");
    const next = ymd(new Date(t.due.getFullYear(), t.due.getMonth(), t.due.getDate() + 1)).replace(/-/g, "");
    lines.push("BEGIN:VEVENT", `UID:${t.id}@airpermithub.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`, `SUMMARY:${esc(`${t.demo ? "[DEMO] " : ""}${t.title}`)}`, `DESCRIPTION:${esc(`${t.facility} · ${t.category}`)}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Compliance calendar. Demo tasks preview the Phase 2 workspace; tasks a user
 * adds are kept in this browser (localStorage) until accounts launch, and the
 * whole calendar exports to .ics for Outlook, Google, or Apple Calendar.
 */
export function ComplianceCalendar() {
  const uid = useId();
  const [today, setToday] = useState<Date | null>(null);
  const [cursor, setCursor] = useState<Date | null>(null);
  const [mine, setMine] = useState<StoredTask[]>([]);
  const [showDemo, setShowDemo] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: "", facility: "", category: "Reporting" as Category, date: "" });

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setToday(d);
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setMine(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: StoredTask[]) => {
    setMine(next);
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch {}
  };

  const tasks: CalTask[] = useMemo(() => {
    if (!today) return [];
    const demo = showDemo ? demoTasks.map((t) => ({ id: t.id, title: t.title, facility: t.facility, category: t.category, due: new Date(today.getTime() + t.dueOffsetDays * 86400000), status: t.status, demo: true })) : [];
    const own = mine.map((t) => { const due = parse(t.date); return { ...t, due, status: statusFor(due, today), demo: false }; });
    return [...demo, ...own].sort((a, b) => +a.due - +b.due);
  }, [today, mine, showDemo]);

  if (!today || !cursor) return <div className="h-[36rem] animate-pulse rounded-2xl bg-white" />;

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => i - first + 1);
  const label = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const upcoming = tasks.filter((t) => t.status !== "completed" && +t.due >= +today - 7 * 86400000).slice(0, 7);

  const exportIcs = () => {
    const blob = new Blob([toIcs(tasks.filter((t) => t.status !== "completed"))], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "airpermithub-compliance.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title || !draft.date) return;
    persist([...mine, { id: `u${Date.now()}`, ...draft, facility: draft.facility || "My facility" }]);
    setDraft({ title: "", facility: draft.facility, category: draft.category, date: "" });
    setAdding(false);
  };

  const field = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none";

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded-lg border border-line p-1.5 hover:bg-canvas" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded-lg border border-line p-1.5 hover:bg-canvas" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
            <h3 className="ml-1 text-lg font-bold text-ink" aria-live="polite">{label}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-canvas">Today</button>
            <label className="flex items-center gap-1.5 text-sm text-muted">
              <input type="checkbox" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} className="h-4 w-4 accent-brand-500" /> Demo tasks
            </label>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-line pb-2 text-center text-xs font-semibold text-muted" aria-hidden="true">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const valid = d > 0 && d <= days;
            const date = new Date(year, month, d);
            const isToday = valid && +date === +today;
            const dayTasks = valid ? tasks.filter((t) => +t.due === +date) : [];
            return (
              <div key={i} className={cn("min-h-16 border-b border-line p-1 text-left sm:min-h-24 [&:not(:nth-child(7n))]:border-r", !valid && "bg-canvas/50")}>
                {valid && <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", isToday ? "bg-brand-500 text-white" : "text-slate-600")}>{d}</span>}
                <div className="mt-0.5 space-y-0.5">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span key={t.id} title={`${t.title} · ${t.facility}${t.demo ? " (demo)" : ""}`} className={cn("block truncate rounded px-1 py-0.5 text-[0.6rem] font-semibold text-white sm:text-[0.65rem]", bar[t.category], t.demo && "opacity-80")}>
                      <span className="hidden sm:inline">{t.title}</span>
                      <span className="sm:hidden">•</span>
                    </span>
                  ))}
                  {dayTasks.length > 3 && <span className="block text-[0.6rem] text-muted">+{dayTasks.length - 3} more</span>}
                </div>
              </div>
            );
          })}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
          {complianceCategories.map((c) => <li key={c} className="flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-sm", bar[c])} />{c}</li>)}
        </ul>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink">Upcoming Deadlines</h3>
            <button onClick={() => setAdding((a) => !a)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              {adding ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />} {adding ? "Cancel" : "Add task"}
            </button>
          </div>
          {adding && (
            <form onSubmit={add} className="mt-4 space-y-2.5 rounded-xl bg-canvas p-3">
              <label htmlFor={`${uid}-t`} className="sr-only">Task</label>
              <input id={`${uid}-t`} required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Task, e.g. Annual compliance certification" className={field} />
              <label htmlFor={`${uid}-f`} className="sr-only">Facility</label>
              <input id={`${uid}-f`} value={draft.facility} onChange={(e) => setDraft({ ...draft, facility: e.target.value })} placeholder="Facility" className={field} />
              <div className="grid grid-cols-2 gap-2">
                <select aria-label="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })} className={field}>
                  {complianceCategories.map((c) => <option key={c}>{c}</option>)}
                </select>
                <input aria-label="Due date" required type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={field} />
              </div>
              <Button type="submit" size="sm" className="w-full">Save task</Button>
              <p className="text-[0.7rem] text-muted">Saved in this browser only until accounts launch. Use the date from your permit condition or rule.</p>
            </form>
          )}
          <ul className="mt-3 divide-y divide-line">
            {upcoming.length === 0 && <li className="py-6 text-center text-sm text-muted">No upcoming tasks.</li>}
            {upcoming.map((t) => (
              <li key={t.id} className="flex items-start gap-3 py-3">
                <span className={cn("flex w-11 shrink-0 flex-col items-center rounded-lg py-1 text-white", bar[t.category])}>
                  <span className="text-[0.6rem] font-bold uppercase">{t.due.toLocaleDateString(undefined, { month: "short" })}</span>
                  <span className="font-display text-lg leading-none font-extrabold">{t.due.getDate()}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  <p className="truncate text-xs text-muted">{t.facility} · {t.category}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <ComplianceBadge status={t.status} />
                    {t.demo && <DemoBadge>Demo</DemoBadge>}
                  </div>
                </div>
                {!t.demo && (
                  <button onClick={() => persist(mine.filter((m) => m.id !== t.id))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${t.title}`}><Trash2 className="h-4 w-4" /></button>
                )}
              </li>
            ))}
          </ul>
          <Button onClick={exportIcs} className="mt-3 w-full"><CalendarPlus className="h-4 w-4" aria-hidden="true" /> Add to My Calendar (.ics)</Button>
        </div>
      </div>
    </div>
  );
}
