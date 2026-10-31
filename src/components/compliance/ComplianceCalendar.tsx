"use client";

import { AlarmClock, CalendarClock, CalendarPlus, Check, ChevronLeft, ChevronRight, Download, Pencil, Plus, Repeat as RepeatIcon, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { downloadText } from "@/components/tools/shared";
import { ComplianceBadge, DemoBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  facilityStatus, occurrences, parseYmd, repeatLabels, STORE, summarize, tasksCsv, toIcs, ymd,
  type Category, type Repeat, type StoredTask,
} from "@/lib/compliance-calendar";
import { complianceCategories, demoTasks } from "@/lib/data/compliance";
import type { ComplianceStatus } from "@/lib/data/types";

interface CalTask { key: string; title: string; facility: string; category: Category; due: Date; status: ComplianceStatus; demo: boolean; task?: StoredTask }

const views = ["month", "week", "day", "list"] as const;
type View = (typeof views)[number];
const DAY = 86400000;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
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

const remindOptions = [0, 1, 3, 7, 14, 30];
interface Form { id: string | null; title: string; facility: string; category: Category; date: string; repeat: Repeat; remindDays: number; basis: string; notes: string }
const blankForm = (keep?: Partial<Form>): Form => ({ id: null, title: "", facility: "", category: "Reporting", date: "", repeat: "none", remindDays: 7, basis: "", notes: "", ...keep });

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

/**
 * Compliance calendar with Month, Week, Day, and List views (?view= keeps the
 * choice linkable). Your own tasks come first: they repeat, carry the permit
 * condition or rule they come from, and export to .ics with reminders. Example
 * (demo) tasks show only until you add one, are always labeled, and are never
 * exported. Tasks are kept in this browser (localStorage) until accounts launch.
 */
export function ComplianceCalendar() {
  const uid = useId();
  const [today, setToday] = useState<Date | null>(null);
  const [cursor, setCursor] = useState<Date | null>(null);
  const [mine, setMine] = useState<StoredTask[]>([]);
  const [showDemo, setShowDemo] = useState(false);
  const [view, setView] = useState<View>("month");
  const [filter, setFilter] = useState<Category | "">("");
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setToday(d);
    setCursor(d);
    const v = new URLSearchParams(window.location.search).get("view");
    if (views.includes(v as View)) setView(v as View);
    let stored: StoredTask[] = [];
    try { stored = JSON.parse(localStorage.getItem(STORE) ?? "[]"); } catch {}
    setMine(stored);
    setShowDemo(stored.length === 0);
  }, []);

  const persist = (next: StoredTask[]) => {
    setMine(next);
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch {}
  };

  // Occurrences in a window around today and the date being viewed.
  const own = useMemo(() => {
    if (!today || !cursor) return [];
    const from = addMonths(+cursor < +today ? cursor : today, -13);
    const until = addMonths(+cursor > +today ? cursor : today, 26);
    return occurrences(mine, today, from, until);
  }, [mine, today, cursor]);

  const tasks: CalTask[] = useMemo(() => {
    if (!today) return [];
    const demo = showDemo ? demoTasks.map((t) => ({ key: t.id, title: t.title, facility: t.facility, category: t.category, due: addDays(today, t.dueOffsetDays), status: t.status, demo: true })) : [];
    const mineCal = own.map((o) => ({ key: o.key, title: o.task.title, facility: o.task.facility, category: o.task.category, due: o.due, status: o.status, demo: false, task: o.task }));
    return [...mineCal, ...demo].sort((a, b) => +a.due - +b.due);
  }, [today, own, showDemo]);

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
  // Open items first: everything overdue, then the next due date of each task (not every repeat).
  const seen = new Set<string>();
  const upcoming = tasks.filter((t) => {
    if (t.status === "completed") return false;
    if (t.status === "overdue") return true;
    const id = t.task?.id ?? t.key;
    if (+t.due < +today || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, 8);
  const onDay = (date: Date) => tasks.filter((t) => +t.due === +date);
  const listed = tasks.filter((t) => (!filter || t.category === filter) && +t.due >= +today - 365 * DAY && +t.due <= +today + 730 * DAY);
  const summary = summarize(own, today);
  const facilities = facilityStatus(own.filter((o) => +o.due <= +today + 365 * DAY));

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
  const toggleDone = (t: CalTask) => {
    if (!t.task) return;
    const key = ymd(t.due);
    persist(mine.map((m) => (m.id !== t.task!.id ? m : { ...m, done: m.done?.includes(key) ? m.done.filter((d) => d !== key) : [...(m.done ?? []), key] })));
  };
  const edit = (task: StoredTask) =>
    setForm({ id: task.id, title: task.title, facility: task.facility, category: task.category, date: task.date, repeat: task.repeat ?? "none", remindDays: task.remindDays ?? 0, basis: task.basis ?? "", notes: task.notes ?? "" });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.title.trim() || !form.date) return;
    const fields = {
      title: form.title.trim(), facility: form.facility.trim() || "My facility", category: form.category, date: form.date,
      repeat: form.repeat, remindDays: form.remindDays, basis: form.basis.trim(), notes: form.notes.trim(),
    };
    if (form.id) persist(mine.map((m) => (m.id === form.id ? { ...m, ...fields } : m)));
    else persist([...mine, { id: `u${Date.now()}`, ...fields, created: ymd(today) }]);
    if (!form.id) setShowDemo(false);
    setForm(null);
    setCursor(parseYmd(form.date));
  };

  const stamp = ymd(new Date());
  const exportIcs = (list: StoredTask[], name: string) => downloadText(name, toIcs(list, new Date()), "text/calendar");
  const exportAll = () => exportIcs(mine, `airpermithub-compliance-${stamp}.ics`);

  const actions = (t: CalTask) => t.task && (
    <div className="flex shrink-0 items-center gap-0.5">
      <button onClick={() => toggleDone(t)} className={cn("rounded-lg p-1.5 hover:bg-eco-50", t.status === "completed" ? "text-eco-600" : "text-slate-400 hover:text-eco-600")} aria-label={t.status === "completed" ? `Mark ${t.title} not done` : `Mark ${t.title} done`} title={t.status === "completed" ? "Undo done" : "Mark done"}>
        {t.status === "completed" ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      </button>
      <button onClick={() => exportIcs([t.task!], `${slug(t.title) || "task"}.ics`)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600" aria-label={`Add ${t.title} to my calendar`} title="Add to my calendar (.ics)"><CalendarPlus className="h-4 w-4" /></button>
      <button onClick={() => edit(t.task!)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600" aria-label={`Edit ${t.title}`} title="Edit"><Pencil className="h-4 w-4" /></button>
      <button onClick={() => removeOwn(t.task!.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${t.title}${t.task!.repeat && t.task!.repeat !== "none" ? " and all its repeats" : ""}`} title="Delete"><Trash2 className="h-4 w-4" /></button>
    </div>
  );

  const meta = (t: CalTask) => (
    <>
      {t.task?.repeat && t.task.repeat !== "none" && <span className="inline-flex items-center gap-1 text-xs text-muted"><RepeatIcon className="h-3 w-3" aria-hidden="true" />{repeatLabels[t.task.repeat]}</span>}
      {t.task?.basis && <span className="text-xs text-muted">Basis: {t.task.basis}</span>}
    </>
  );

  const taskRow = (t: CalTask, showDate: boolean) => (
    <li key={t.key} className={cn("flex items-start gap-3 py-3", t.demo && "opacity-75")}>
      <span className={cn("mt-1 h-10 w-1.5 shrink-0 rounded-full", bar[t.category])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold text-ink", t.status === "completed" && "text-muted line-through")}>{t.title}</p>
        <p className="text-xs text-muted">{showDate && <>{t.due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · </>}{t.facility} · {t.category}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <ComplianceBadge status={t.status} />
          {t.demo && <DemoBadge>Example (demo)</DemoBadge>}
          {meta(t)}
        </div>
      </div>
      {actions(t)}
    </li>
  );

  const field = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none";
  const chip = (t: CalTask) => cn("block truncate rounded px-1 py-0.5 font-semibold text-white", bar[t.category], t.demo && "opacity-60", t.status === "completed" && "line-through opacity-50");

  return (
    <div className="space-y-6">
      {/* Summary of your own tasks */}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Your tasks at a glance">
        {[
          { label: "Overdue", value: summary.overdue, icon: AlarmClock, tone: "text-red-500" },
          { label: "Due within 14 days", value: summary.dueSoon, icon: CalendarClock, tone: "text-amber-500" },
          { label: "Due in the next 30 days", value: summary.next30, icon: CalendarClock, tone: "text-brand-500" },
          { label: "Marked done", value: summary.completed, icon: Check, tone: "text-eco-600" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <li key={label} className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
            <p className="mt-3 font-display text-3xl font-extrabold text-ink tabular-nums">{value}</p>
            <p className="text-xs font-medium text-muted">{label}</p>
          </li>
        ))}
      </ul>
      {mine.length === 0 && (
        <p className="-mt-3 text-xs text-muted">These counts cover only tasks you add. Example tasks are never counted.</p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
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
                <input type="checkbox" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} className="h-4 w-4 accent-brand-500" /> Show examples
              </label>
            </div>
          </div>

          {showDemo && (
            <p className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
              <DemoBadge>Demo</DemoBadge>
              {mine.length === 0
                ? "Faded entries are fictional examples so you can see how the calendar works. They disappear when you add your first task and are never exported."
                : "Faded entries are fictional examples. They are never counted or exported."}
            </p>
          )}

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
                <div key={i} className={cn("relative min-h-16 border-b border-line p-1 text-left sm:min-h-24 [&:not(:nth-child(7n))]:border-r", !valid && "bg-canvas/50")}>
                  {valid && (
                    <button data-print onClick={() => openDay(date)} aria-label={`${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}: ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}`} className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold after:absolute after:inset-0 hover:ring-2 hover:ring-brand-200", isToday ? "bg-brand-600 text-white" : "text-slate-600")}>{d}</button>
                  )}
                  <div className="mt-0.5 space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <span key={t.key} title={`${t.demo ? "Example (demo): " : ""}${t.title} · ${t.facility}`} className={cn(chip(t), "text-[0.6rem] sm:text-[0.65rem]")}>
                        <span className="hidden sm:inline">{t.demo ? "Demo · " : ""}{t.title}</span>
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
                        <li key={t.key} title={`${t.demo ? "Example (demo): " : ""}${t.title} · ${t.facility}`} className={cn(chip(t), "px-1.5 py-1 text-[0.7rem] leading-snug whitespace-normal")}>{t.demo ? "Demo · " : ""}{t.title}</li>
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
                <span className="text-sm text-muted">{listed.length} task{listed.length === 1 ? "" : "s"} from a year ago to two years ahead</span>
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
                      <tr key={t.key} className={cn(t.demo && "opacity-75")}>
                        <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{t.due.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("font-medium text-ink", t.status === "completed" && "text-muted line-through")}>{t.title}</span> {t.demo && <DemoBadge>Example (demo)</DemoBadge>}
                          <span className="mt-0.5 flex flex-wrap gap-x-2">{meta(t)}</span>
                        </td>
                        <td className="px-4 py-2.5">{t.facility}</td>
                        <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-sm", bar[t.category])} aria-hidden="true" />{t.category}</span></td>
                        <td className="px-4 py-2.5"><ComplianceBadge status={t.status} /></td>
                        <td className="px-2 py-2.5 text-right">{actions(t)}</td>
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
              <h3 className="text-lg font-bold text-ink">{form?.id ? "Edit task" : "Your deadlines"}</h3>
              <button onClick={() => setForm((f) => (f ? null : blankForm({ facility: mine[mine.length - 1]?.facility ?? "" })))} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                {form ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />} {form ? "Cancel" : "Add task"}
              </button>
            </div>
            {!form && mine.length === 0 && (
              <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold text-ink">Start with your own deadlines</p>
                <p className="mt-1">Add a task from your permit, set how often it repeats and when to be reminded, then send it to Outlook, Google, or Apple Calendar.</p>
                <Button size="sm" className="mt-3" onClick={() => setForm(blankForm())}><Plus className="h-4 w-4" aria-hidden="true" /> Add your first task</Button>
              </div>
            )}
            {form && (
              <form onSubmit={save} className="mt-4 space-y-2.5 rounded-xl bg-canvas p-3">
                <label htmlFor={`${uid}-t`} className="block text-xs font-semibold text-ink">Task</label>
                <input id={`${uid}-t`} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Semiannual monitoring report" className={field} />
                <label htmlFor={`${uid}-f`} className="block text-xs font-semibold text-ink">Facility</label>
                <input id={`${uid}-f`} value={form.facility} onChange={(e) => setForm({ ...form, facility: e.target.value })} placeholder="Facility name" className={field} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`${uid}-c`} className="block text-xs font-semibold text-ink">Category</label>
                    <select id={`${uid}-c`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className={field}>
                      {complianceCategories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${uid}-d`} className="block text-xs font-semibold text-ink">{form.repeat === "none" ? "Due date" : "First due date"}</label>
                    <input id={`${uid}-d`} required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} />
                  </div>
                  <div>
                    <label htmlFor={`${uid}-r`} className="block text-xs font-semibold text-ink">Repeats</label>
                    <select id={`${uid}-r`} value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value as Repeat })} className={field}>
                      {(Object.keys(repeatLabels) as Repeat[]).map((r) => <option key={r} value={r}>{repeatLabels[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${uid}-m`} className="block text-xs font-semibold text-ink">Reminder</label>
                    <select id={`${uid}-m`} value={form.remindDays} onChange={(e) => setForm({ ...form, remindDays: Number(e.target.value) })} className={field}>
                      {remindOptions.map((n) => <option key={n} value={n}>{n === 0 ? "None" : `${n} day${n === 1 ? "" : "s"} before`}</option>)}
                    </select>
                  </div>
                </div>
                <label htmlFor={`${uid}-b`} className="block text-xs font-semibold text-ink">Basis <span className="font-normal text-muted">(permit condition or rule)</span></label>
                <input id={`${uid}-b`} value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value })} placeholder="e.g. Permit O-01234, Condition 3.2" className={field} />
                <label htmlFor={`${uid}-n`} className="block text-xs font-semibold text-ink">Notes <span className="font-normal text-muted">(optional)</span></label>
                <textarea id={`${uid}-n`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                <Button type="submit" size="sm" className="w-full">{form.id ? "Save changes" : "Save task"}</Button>
                <p className="text-[0.7rem] text-muted">Saved in this browser only until accounts launch. Use the date your permit condition or the rule sets; AirPermitHub doesn&apos;t supply deadlines.</p>
              </form>
            )}
            <ul className="mt-3 divide-y divide-line">
              {upcoming.length === 0 && mine.length > 0 && <li className="py-6 text-center text-sm text-muted">Nothing open. Every task is marked done.</li>}
              {upcoming.map((t) => (
                <li key={t.key} className={cn("flex items-start gap-3 py-3", t.demo && "opacity-75")}>
                  <span className={cn("flex w-11 shrink-0 flex-col items-center rounded-lg py-1 text-white", bar[t.category])}>
                    <span className="text-[0.6rem] font-bold uppercase">{t.due.toLocaleDateString(undefined, { month: "short" })}</span>
                    <span className="font-display text-lg leading-none font-extrabold">{t.due.getDate()}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{t.title}</p>
                    <p className="truncate text-xs text-muted">{t.facility} · {t.category}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <ComplianceBadge status={t.status} />
                      {t.demo && <DemoBadge>Example (demo)</DemoBadge>}
                      {t.task?.repeat && t.task.repeat !== "none" && <span className="inline-flex items-center gap-1 text-xs text-muted"><RepeatIcon className="h-3 w-3" aria-hidden="true" />{repeatLabels[t.task.repeat]}</span>}
                    </div>
                  </div>
                  {actions(t)}
                </li>
              ))}
            </ul>
            <Button onClick={exportAll} className="mt-3 w-full" disabled={mine.length === 0} title={mine.length === 0 ? "Add a task first. Examples are never exported." : undefined}>
              <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Add all to my calendar (.ics)
            </Button>
            <Button onClick={() => downloadText(`airpermithub-compliance-${stamp}.csv`, tasksCsv(mine))} variant="subtle" size="sm" className="mt-2 w-full" disabled={mine.length === 0}>
              <Download className="h-4 w-4" aria-hidden="true" /> Export task list (CSV)
            </Button>
            <p className="mt-2 text-[0.7rem] text-muted">The .ics file works with Outlook, Google Calendar, and Apple Calendar. Repeats and reminders come with it; example tasks never do.</p>
          </div>
        </div>
      </div>

      {facilities.length > 0 && (
        <section aria-labelledby={`${uid}-fac`}>
          <h2 id={`${uid}-fac`} className="text-lg font-bold text-ink">Facility status</h2>
          <p className="mt-1 text-sm text-muted">From your tasks over the next 12 months: the most urgent open item at each facility.</p>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {facilities.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{f.name}</p>
                  <p className="text-xs text-muted">{f.open} open task{f.open === 1 ? "" : "s"}{f.next ? ` · next due ${f.next.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : ""}</p>
                </div>
                <ComplianceBadge status={f.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
