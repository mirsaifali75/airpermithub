"use client";

import { ArrowRight, ExternalLink, FileText, Landmark, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { VerificationBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { StateAirPermitProfile } from "@/lib/data/state-profile-types";
import usMap from "@/lib/data/us-map.json";

export type MapProfile = Pick<StateAirPermitProfile, "slug" | "code" | "name" | "agency" | "verification" | "lastReviewed" | "forms" | "guidance"> & {
  programs: { name: string; type: string; url?: string }[];
};

const shortAgency = (name: string) => name.match(/\(([A-Z][A-Za-z&. -]{1,13})\)/)?.[1] ?? name;

const fillFor = (v: MapProfile["verification"] | undefined, selected: boolean, hovered: boolean) => {
  if (selected) return "#147DFF";
  if (hovered) return "#8fb4ff";
  if (v === "verified") return "#cddcf7";
  if (v === "partial") return "#e3e8f0";
  return "#eef1f6";
};

/**
 * U.S. state explorer: a geographic choropleth (Census-derived Albers USA
 * shapes) next to a searchable state list. The list is the keyboard and
 * screen-reader control; the map mirrors it for pointer users.
 */
export function StateExplorer({ profiles, initial = "texas", compact = false }: { profiles: MapProfile[]; initial?: string; compact?: boolean }) {
  const [selected, setSelected] = useState(initial);
  const [hover, setHover] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const bySlug = useMemo(() => new Map(profiles.map((p) => [p.slug, p])), [profiles]);
  const profile = bySlug.get(selected);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return usMap.states
      .map((s) => ({ slug: s.slug, name: s.name, p: bySlug.get(s.slug) }))
      .filter((s) => !term || s.name.toLowerCase().includes(term) || (s.p && s.p.agency.name.toLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [q, bySlug]);
  const verifiedCount = profiles.filter((p) => p.verification === "verified").length;
  const hovered = hover ? usMap.states.find((s) => s.slug === hover) : null;

  return (
    <div className="space-y-5">
      <div className={cn("grid gap-5", compact ? "lg:grid-cols-[minmax(0,1fr)_15rem]" : "lg:grid-cols-[minmax(0,1fr)_17rem]")}>
        <div className="relative rounded-2xl border border-line bg-white p-3 shadow-card sm:p-5">
          <svg viewBox={`0 0 ${usMap.width} ${usMap.height}`} className="h-auto w-full" role="img" aria-label="Map of U.S. states. Use the state list to select a state.">
            <g>
              {usMap.states.map((s) => {
                const p = bySlug.get(s.slug);
                return (
                  <path
                    key={s.slug}
                    d={s.d}
                    fill={fillFor(p?.verification, s.slug === selected, s.slug === hover)}
                    stroke="#ffffff"
                    strokeWidth={1}
                    className="cursor-pointer transition-[fill] duration-150"
                    onClick={() => setSelected(s.slug)}
                    onMouseEnter={() => setHover(s.slug)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <title>{s.name}</title>
                  </path>
                );
              })}
            </g>
            {usMap.states
              .filter((s) => s.slug === selected)
              .map((s) => (
                <path key="sel" d={s.d} fill="none" stroke="#0B2942" strokeWidth={1.5} pointerEvents="none" />
              ))}
          </svg>
          <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-semibold text-navy-900 shadow-card sm:top-5 sm:left-5">
            {hovered ? hovered.name : "Select a state"}
          </div>
          <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted">
            <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#cddcf7]" />Verified against agency pages ({verifiedCount})</li>
            <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#e3e8f0] ring-1 ring-line" />Partially verified ({profiles.length - verifiedCount})</li>
            <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-brand-500" />Selected</li>
          </ul>
        </div>

        <div className="flex min-h-0 flex-col rounded-2xl border border-line bg-white shadow-card">
          <div className="border-b border-line p-3">
            <label className="relative block">
              <span className="sr-only">Filter states</span>
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a state or agency" className="h-9 w-full rounded-lg border border-line pr-3 pl-9 text-sm focus:border-brand-500 focus:outline-none" />
            </label>
          </div>
          <ul className="max-h-64 overflow-y-auto p-1.5 lg:max-h-[24rem]" aria-label="States">
            {list.map((s) => (
              <li key={s.slug}>
                <button
                  onClick={() => setSelected(s.slug)}
                  aria-pressed={s.slug === selected}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm",
                    s.slug === selected ? "bg-brand-600 font-semibold text-white" : "text-ink hover:bg-canvas",
                  )}
                >
                  <span className="truncate">{s.name}</span>
                  {s.p && <span className={cn("max-w-[7.5rem] truncate text-[0.7rem] font-semibold", s.slug === selected ? "text-white" : "text-muted")}>{shortAgency(s.p.agency.name)}</span>}
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No match.</li>}
          </ul>
          <Link href="/states" className="border-t border-line px-4 py-3 text-sm font-semibold text-brand-600 hover:text-brand-700">All states &amp; agencies →</Link>
        </div>
      </div>

      {profile && (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-live="polite">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 font-display text-lg font-extrabold text-white">
                {profile.code}
              </span>
              <div>
                <h3 className="text-xl font-bold text-navy-900">{profile.name} – {shortAgency(profile.agency.name)}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <VerificationBadge level={profile.verification} />
                  <span className="text-xs text-muted">Last reviewed {profile.lastReviewed}</span>
                </div>
              </div>
            </div>
            <p className="max-w-md text-sm text-muted">
              {profile.name} air permitting at a glance: {profile.programs.slice(0, 4).map((p) => p.name).join(", ")}
              {profile.programs.length > 4 ? `, and ${profile.programs.length - 4} more` : ""}.
            </p>
          </div>
          <ul className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {profile.programs.filter((p) => p.url).slice(0, compact ? 3 : 6).map((p) => (
              <li key={p.name}>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex h-full items-center gap-2.5 rounded-xl border border-line px-3.5 py-2.5 text-sm font-medium text-brand-700 hover:border-brand-200 hover:bg-brand-50/60">
                  <Landmark className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                </a>
              </li>
            ))}
            {profile.forms.slice(0, compact ? 1 : 2).map((f) => (
              <li key={f.url}>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex h-full items-center gap-2.5 rounded-xl border border-line px-3.5 py-2.5 text-sm font-medium text-brand-700 hover:border-brand-200 hover:bg-brand-50/60">
                  <FileText className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                </a>
              </li>
            ))}
            <li>
              <Link href={`/states/${profile.slug}`} className="flex h-full items-center gap-2.5 rounded-xl bg-navy-900 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                Open full {profile.name} hub <ArrowRight className="ml-auto h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted">External links open the agency&apos;s official page.</p>
        </div>
      )}
    </div>
  );
}
