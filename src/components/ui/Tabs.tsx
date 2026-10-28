"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Tab strip with server-rendered panels. Syncs with ?tab= so tabs are linkable. */
export function Tabs({ tabs, className }: { tabs: { label: string; count?: number; content: ReactNode }[]; className?: string }) {
  const id = useId();
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    const i = tabs.findIndex((x) => slug(x.label) === t);
    if (i >= 0) setActive(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (i: number) => {
    setActive(i);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", slug(tabs[i].label));
    window.history.replaceState(null, "", url);
  };

  return (
    <div className={className}>
      <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            id={`${id}-t${i}`}
            role="tab"
            aria-selected={active === i}
            aria-controls={`${id}-p${i}`}
            onClick={() => select(i)}
            className={cn("shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors", active === i ? "bg-brand-600 text-white shadow-card" : "text-slate-600 hover:bg-white hover:text-ink")}
          >
            {t.label}
            {t.count !== undefined && <span className={cn("ml-1 text-xs", active === i ? "text-white/75" : "text-slate-400")}>{t.count}</span>}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.label} id={`${id}-p${i}`} role="tabpanel" aria-labelledby={`${id}-t${i}`} hidden={active !== i} className="mt-5">
          {t.content}
        </div>
      ))}
    </div>
  );
}
