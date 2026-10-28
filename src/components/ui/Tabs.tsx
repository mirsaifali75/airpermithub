"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  label: string;
  count?: number;
  content: ReactNode;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * Tab strip with server-rendered panels. Syncs with ?tab= so tabs are linkable
 * (turn off with `sync={false}`). Arrow keys, Home, and End move between tabs.
 * `printAll` prints every panel, so a printed page carries the whole record.
 * Pass `selected` and `onSelect` to control the active tab from outside.
 */
export function Tabs({
  tabs, className, variant = "pill", sync = true, printAll = false, selected, onSelect, panelClassName,
}: {
  tabs: TabItem[];
  className?: string;
  variant?: "pill" | "underline";
  sync?: boolean;
  printAll?: boolean;
  selected?: number;
  onSelect?: (i: number) => void;
  panelClassName?: string;
}) {
  const id = useId();
  const [inner, setInner] = useState(0);
  const active = selected ?? inner;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!sync) return;
    const t = new URLSearchParams(window.location.search).get("tab");
    const i = tabs.findIndex((x) => slug(x.label) === t);
    if (i >= 0) {
      setInner(i);
      onSelect?.(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (i: number) => {
    setInner(i);
    onSelect?.(i);
    if (sync) {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", slug(tabs[i].label));
      window.history.replaceState(null, "", url);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = tabs.length - 1;
    const to = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (to === null) return;
    e.preventDefault();
    select(to);
    refs.current[to]?.focus();
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        className={cn(
          "no-print flex overflow-x-auto",
          variant === "pill" ? "-mx-1 gap-1 px-1 pb-1" : "gap-1 border-b border-line",
        )}
      >
        {tabs.map((t, i) => (
          <button
            key={t.label}
            ref={(el) => { refs.current[i] = el; }}
            id={`${id}-t${i}`}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-controls={`${id}-p${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "shrink-0 text-sm font-semibold whitespace-nowrap transition-colors",
              variant === "pill"
                ? cn("rounded-lg px-3.5 py-2", active === i ? "bg-brand-600 text-white shadow-card" : "text-slate-600 hover:bg-white hover:text-ink")
                : cn("-mb-px border-b-2 px-3 py-3", active === i ? "border-brand-600 text-brand-700" : "border-transparent text-slate-600 hover:border-line hover:text-ink"),
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn("ml-1 text-xs", active === i && variant === "pill" ? "text-white/75" : "text-slate-400")}>{t.count}</span>
            )}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.label}
          id={`${id}-p${i}`}
          role="tabpanel"
          aria-labelledby={`${id}-t${i}`}
          tabIndex={0}
          className={cn("mt-5 focus-visible:outline-offset-4", active !== i && (printAll ? "hidden print:block" : "hidden"), panelClassName)}
        >
          {printAll && <h2 className="mb-3 hidden text-lg font-bold text-ink print:block">{t.label}</h2>}
          {t.content}
        </div>
      ))}
    </div>
  );
}
