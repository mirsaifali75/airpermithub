"use client";

import { ArrowRight, CornerDownLeft, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { exampleQueries, quickLinks, search, type SearchDoc } from "@/lib/search";

let indexRequest: Promise<SearchDoc[]> | null = null;
/** The index is a static file fetched once, when search is first used, so pages don't carry it. */
export function preloadSearchIndex() {
  indexRequest ??= fetch("/search-index.json")
    .then((r) => (r.ok ? (r.json() as Promise<SearchDoc[]>) : Promise.reject(new Error(`HTTP ${r.status}`))))
    .catch((e) => {
      indexRequest = null;
      throw e;
    });
  return indexRequest;
}

/** Command-palette style global search. Opens with the header button or Ctrl/⌘ + K. */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<SearchDoc[] | null>(null);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();
  const results = useMemo(() => (index ? search(index, q).slice(0, 8) : []), [index, q]);

  useEffect(() => {
    if (!open || index) return;
    let live = true;
    setFailed(false);
    preloadSearchIndex().then((i) => live && setIndex(i), () => live && setFailed(true));
    return () => { live = false; };
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const submit = () => {
    if (results[active]) go(results[active].href);
    else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-navy-950/70 px-4 pt-[10vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search AirPermitHub"
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-lift"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-brand-500" aria-hidden="true" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter") { e.preventDefault(); submit(); }
            }}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-label="Search permits, regulations, equipment, facilities, or keywords"
            placeholder="Search permits, regulations, equipment, facilities, or keywords..."
            className="h-14 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-slate-400"
          />
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-slate-100" aria-label="Close search">
            <X className="h-5 w-5" />
          </button>
        </div>

        {q.trim() === "" ? (
          <div className="space-y-4 p-4">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Go to</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {quickLinks.map((l) => (
                  <button key={l.href} onClick={() => go(l.href)} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-left text-sm font-semibold text-ink hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">
                    {l.label} <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
            <div>
            <p className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Try searching</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQ(ex)}
                  className="rounded-full border border-line bg-canvas px-3 py-1.5 text-sm text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  {ex}
                </button>
              ))}
            </div>
            </div>
          </div>
        ) : (
          <ul id={listId} role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">
                {index ? <>No matches. Try a state, a rule such as “OOOOb” or “60.5365b”, or a piece of equipment.</> : failed ? <>Search didn&apos;t load. Press Enter to search on the results page.</> : "Loading search…"}
              </li>
            )}
            {results.map((r, idx) => (
              <li key={r.href + r.title} id={`${listId}-${idx}`} role="option" aria-selected={idx === active}>
                <button
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => go(r.href)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left ${idx === active ? "bg-brand-50" : ""}`}
                >
                  <span className="mt-0.5 rounded-md bg-navy-900/5 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide text-navy-700 uppercase">{r.kind}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{r.title}</span>
                    <span className="line-clamp-1 text-sm text-muted">{r.snippet}</span>
                  </span>
                  {idx === active && <CornerDownLeft className="mt-1 h-4 w-4 text-brand-500" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between border-t border-line bg-canvas px-4 py-2.5 text-xs text-muted">
          <span>Search covers AirPermitHub pages. Permit and document search arrives with the database.</span>
          <button onClick={() => go(`/search?q=${encodeURIComponent(q)}`)} className="hidden items-center gap-1 font-semibold text-brand-600 sm:inline-flex">
            All results <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
