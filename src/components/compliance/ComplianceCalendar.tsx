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
const views = ["month", "week", "day", "list"] as const;
type View = (typeof views)[number];
const DAY = 86400000;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(d, -d.getDay());

const bar: Record<Category, string> = {
  // Dark enough for white text (WCAG AA).
  Testing: "bg-violet-600",
  Inspection: "bg-teal-700",
  Reporting: "bg-brand-600",
  Certification: "bg-eco-600",
  "Permit Renewal": "bg-orange-700",
  Monitoring: "bg-cyan-700",
  Recordkeeping: "bg-slate-600",
  LDAR: "bg-rose-700",
  "Emission Inventory": "bg-amber-800",
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
 * Compliance calendar with Month, Week, Day, and List views (?view= keeps the
 * choice linkable). Demo tasks preview the compliance workspace; tasks a user
 * adds are kept in this browser (localStorage) until accounts launch, and the
 * whole calendar exports to .ics for Outlook, Google, or Apple Calendar.
 */
export function ComplianceCalendar() {
  const uid = useId();
  const [today, setToday] = useState<Date | null>(null);
  const [cursor, setCursor] = useState<Date | null>(null);
  const [mine, setMine] = useState<StoredTask[]>([]);
  const [showDemo, setShowDemo] = useState(true);
  const [view, setView] = useState<View>("month");
  const [filter, setFilter] = useState<Category | "">("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: "", facility: "", category: "Reporting" as Category, date: "" });

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setToday(d);
    setCursor(d);
    const v = new URLSearchParams(window.location.search).get("view");
    if (views.includes(v as View)) setView(v as View);
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
    const demo = showDemo ? demoTasks.map((t) => ({ id: t.id, title: t.title, facility: t.facility, category: t.category, due: addDays(today, t.dueOffsetDays), status: t.status, demo: true })) : [];
    const own = mine.map((t) => { const due = parse(t.date); return { ...t, due, status: statusFor(due, today), demo: false }; });
    return [...demo, ...own].sort((a, b) => +a.due - +b.due);
  }, [today, mine, showDemo]);

  if (!today || !cursor) return <div className="h-[36rem] animate-pulse rounded-2xl bg-white" />;

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => i - first + 1);
  const weekStart = startOfWeek(cursor);
  const weekEnd = addDays(weekStart, 6);
  const label =
    view === "month" ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : view === "week" ? `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
    : view === "day" ? cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "All tasks";
  const upcoming = tasks.filter((t) => t.status !== "completed" && +t.due >= +today - 7 * DAY).slice(0, 7);
  const onDay = (date: Date) => tasks.filter((t) => +t.due === +date);
  const listed = tasks.filter((t) => !filter || t.category === filter);

  const changeView = (v: View) => {
    setView(v);
    const url = new URL(window.location.href);
    url.searchParams.set("view", v);
    window.history.replaceState(null, "", url);
  };
  const step = (dir: 1 | -1) =>
    setCursor(view === "month" ? new Date(year, month + dir, 1) : view === "week" ? addDays(cursor, 7 * dir) : addDays(cursor, dir));
  const openDay = (date: Date) => { setCursor(date); changeView("day"); };
  const removeOwn = (id: string) => persist(mine.filter((m) => m.id !== id));

  const taskRow = (t: CalTask, showDate: boolean) => (
    <li key={t.id} className="flex items-start gap-3 py-3">
      <span className={cn("mt-1 h-10 w-1.5 shrink-0 rounded-full", bar[t.category])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{t.title}</p>
        <p className="text-xs text-muted">{showDate && <>{t.due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · </>}{t.facility} · {t.category}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <ComplianceBadge status={t.status} />
          {t.demo && <DemoBadge>Demo</DemoBadge>}
        </div>
      </div>
      {!t.demo && (
        <button onClick={() => removeOwn(t.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${t.title}`}><Trash2 className="h-4 w-4" /></button>
      )}
    </li>
  );

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
          <div className="flex min-w-0 items-center gap-2">
            {view !== "list" && (
              <>
                <button onClick={() => step(-1)} className="rounded-lg border border-line p-1.5 hover:bg-canvas" aria-label={`Previous ${view}`}><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => step(1)} className="rounded-lg border border-line p-1.5 hover:bg-canvas" aria-label={`Next ${view}`}><ChevronRight className="h-4 w-4" /></button>
              </>
            )}
            <h3 className="ml-1 text-lg font-bold text-ink" aria-live="polite">{label}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Calendar view" className="flex rounded-lg border border-line p-0.5">
              {views.map((v) => (
                <button key={v} onClick={() => changeView(v)} aria-pressed={view === v} className={cn("rounded-md px-2.5 py-1 text-sm font-semibold capitalize", view === v ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-canvas")}>{v}</button>
              ))}
            </div>
            {view !== "list" && <button onClick={() => setCursor(today)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-canvas">Today</button>}
            <label className="flex items-center gap-1.5 text-sm text-muted">
              <input type="checkbox" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} className="h-4 w-4 accent-brand-500" /> Demo tasks
            </label>
          </div>
        </div>
        {view === "month" && (<>
        <div className="grid grid-cols-7 border-b border-line pb-2 text-center text-xs font-semibold text-muted" aria-hidden="true">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const valid = d > 0 && d <= days;
            const date = new Date(year, month, d);
            const isToday = valid && +date === +today;
            const dayTasks = valid ? onDay(date) : [];
            return (
              <div key={i} className={cn("min-h-16 border-b border-line p-1 text-left sm:min-h-24 [&:not(:nth-child(7n))]:border-r", !valid && "bg-canvas/50")}>
                {valid && (
                  <button onClick={() => openDay(date)} aria-label={`${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}: ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}`} className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold hover:ring-2 hover:ring-brand-200", isToday ? "bg-brand-600 text-white" : "text-slate-600")}>{d}</button>
                )}
                <div className="mt-0.5 space-y-0.5">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span key={t.id} title={`${t.title} · ${t.facility}${t.demo ? " (demo)" : ""}`} className={cn("block truncate rounded px-1 py-0.5 text-[0.6rem] font-semibold text-white sm:text-[0.65rem]", bar[t.category])}>
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
        </>)}

        {view === "week" && (
          <ol className="grid gap-2 md:grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => {
              const dayTasks = onDay(date);
              const isToday = +date === +today;
              return (
                <li key={+date} className={cn("min-h-28 rounded-xl border p-2", isToday ? "border-brand-500 bg-brand-50/40" : "border-line")}>
                  <button onClick={() => openDay(date)} className="flex w-full items-baseline justify-between text-left">
                    <span className="text-xs font-semibold text-muted uppercase">{date.toLocaleDateString(undefined, { weekday: "short" })}</span>
                    <span className={cn("text-sm font-bold", isToday ? "text-brand-700" : "text-ink")}>{date.getDate()}</span>
                  </button>
                  <ul className="mt-2 space-y-1">
                    {dayTasks.map((t) => (
                      <li key={t.id} title={`${t.title} · ${t.facility}${t.demo ? " (demo)" : ""}`} className={cn("rounded px-1.5 py-1 text-[0.7rem] leading-snug font-semibold text-white", bar[t.category])}>{t.title}</li>
                    ))}
                    {dayTasks.length === 0 && <li className="text-xs text-muted md:hidden">No tasks</li>}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}

        {view === "day" && (() => {
          const dayTasks = onDay(cursor);
          const next = tasks.find((t) => +t.due > +cursor && t.status !== "completed");
          return dayTasks.length ? (
            <ul className="divide-y divide-line">{dayTasks.map((t) => taskRow(t, false))}</ul>
          ) : (
            <div className="rounded-xl bg-canvas px-4 py-10 text-center text-sm text-muted">
              No tasks on this day.
              {next && <button onClick={() => setCursor(next.due)} className="ml-1 font-semibold text-brand-600 hover:text-brand-700">Jump to the next task ({next.due.toLocaleDateString(undefined, { month: "short", day: "numeric" })})</button>}
            </div>
          );
        })()}

        {view === "list" && (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label htmlFor={`${uid}-cat`} className="text-sm text-muted">Category</label>
              <select id={`${uid}-cat`} value={filter} onChange={(e) => setFilter(e.target.value as Category | "")} className="h-9 rounded-lg border border-line bg-white px-2 text-sm">
                <option value="">All categories</option>
                {complianceCategories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <span className="text-sm text-muted">{listed.length} task{listed.length === 1 ? "" : "s"}</span>
            </div>
            <ul className="divide-y divide-line sm:hidden">{listed.map((t) => taskRow(t, true))}</ul>
            <div className="hidden overflow-x-auto rounded-xl border border-line sm:block">
              <table className="w-full text-sm">
                <caption className="sr-only">Compliance tasks</caption>
                <thead className="bg-canvas text-left text-xs text-muted uppercase">
                  <tr><th scope="col" className="px-4 py-2.5">Date</th><th scope="col" className="px-4 py-2.5">Requirement</th><th scope="col" className="px-4 py-2.5">Facility</th><th scope="col" className="px-4 py-2.5">Type</th><th scope="col" className="px-4 py-2.5">Status</th><th scope="col" className="px-2 py-2.5"><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {listed.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{t.due.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td className="px-4 py-2.5 font-medium text-ink">{t.title} {t.demo && <DemoBadge>Demo</DemoBadge>}</td>
                      <td className="px-4 py-2.5">{t.facility}</td>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-sm", bar[t.category])} aria-hidden="true" />{t.category}</span></td>
                      <td className="px-4 py-2.5"><ComplianceBadge status={t.status} /></td>
                      <td className="px-2 py-2.5 text-right">
                        {!t.demo && <button onClick={() => removeOwn(t.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${t.title}`}><Trash2 className="h-4 w-4" /></button>}
                      </td>
                    </tr>
                  ))}
                  {listed.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No tasks.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                  <button onClick={() => removeOwn(t.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${t.title}`}><Trash2 className="h-4 w-4" /></button>
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
