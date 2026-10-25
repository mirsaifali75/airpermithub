"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { ComplianceBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { demoTasks } from "@/lib/data/compliance";

const dot: Record<string, string> = { overdue: "bg-red-500", "due-soon": "bg-amber-500", "on-track": "bg-eco-500", completed: "bg-brand-500", "not-evaluated": "bg-slate-400" };

/** Monthly calendar over the demo task list. Dates are computed on the client to avoid stale SSR dates. */
export function ComplianceCalendar() {
  const [today] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const tasks = useMemo(() => demoTasks.map((t) => ({ ...t, due: new Date(today.getTime() + t.dueOffsetDays * 86400000) })), [today]);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => i - first + 1);
  const label = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const monthTasks = tasks.filter((t) => t.due.getFullYear() === year && t.due.getMonth() === month).sort((a, b) => +a.due - +b.due);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">{label}</h3>
          <div className="flex gap-1">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded-lg p-2 hover:bg-canvas" aria-label="Previous month"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded-lg p-2 hover:bg-canvas" aria-label="Next month"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted" aria-hidden="true">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const valid = d > 0 && d <= days;
            const date = new Date(year, month, d);
            const isToday = valid && +date === +today;
            const dayTasks = valid ? tasks.filter((t) => +t.due === +date) : [];
            return (
              <div key={i} className={cn("min-h-14 rounded-lg p-1.5 text-left text-xs sm:min-h-20", valid ? "bg-canvas" : "bg-transparent", isToday && "ring-2 ring-brand-500")}>
                {valid && <span className={cn("font-semibold", isToday ? "text-brand-600" : "text-slate-600")}>{d}</span>}
                <div className="mt-1 space-y-0.5">
                  {dayTasks.map((t) => (
                    <span key={t.id} title={t.title} className="flex items-center gap-1 truncate text-[0.65rem] text-ink">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot[t.status])} />
                      <span className="hidden truncate sm:inline">{t.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h3 className="text-lg font-bold text-ink">This month</h3>
        {monthTasks.length === 0 ? <p className="mt-3 text-sm text-muted">No demo tasks this month.</p> : (
          <ul className="mt-3 divide-y divide-line">
            {monthTasks.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  <p className="text-xs text-muted">{t.facility} · {t.category} · {t.due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                </div>
                <ComplianceBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
