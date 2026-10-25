"use client";

import { ArrowRight, ExternalLink, FileText, Landmark } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { VerificationBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { stateTiles } from "@/lib/data/states";
import type { StateAirPermitProfile } from "@/lib/data/state-profile-types";

export type MapProfile = Pick<StateAirPermitProfile, "slug" | "name" | "agency" | "verification" | "lastReviewed" | "forms" | "guidance"> & {
  programs: string[];
};

const COLS = 11;
const ROWS = 8;

/**
 * Tile-grid U.S. map. Equal-size tiles keep small states clickable and the
 * map fully keyboard accessible (each tile is a button in a labeled grid).
 */
export function StateTileMap({ profiles, initial = "texas" }: { profiles: MapProfile[]; initial?: string }) {
  const [selected, setSelected] = useState(initial);
  const bySlug = new Map(profiles.map((p) => [p.slug, p]));
  const tile = stateTiles.find((s) => s.slug === selected)!;
  const profile = bySlug.get(selected);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-6">
        <div role="group" aria-label="U.S. states" className="grid gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))` }}>
          {stateTiles.map((s) => {
            const live = bySlug.has(s.slug);
            const isSel = s.slug === selected;
            return (
              <button
                key={s.code}
                onClick={() => setSelected(s.slug)}
                aria-pressed={isSel}
                aria-label={`${s.name}${live ? ", hub available" : ", in research"}`}
                style={{ gridRow: s.row + 1, gridColumn: s.col + 1 }}
                className={cn(
                  "aspect-square rounded-md text-[0.6rem] font-bold transition-all sm:rounded-lg sm:text-xs",
                  isSel
                    ? "bg-brand-500 text-white ring-2 ring-brand-500 ring-offset-2"
                    : live
                      ? "bg-navy-900 text-white hover:bg-navy-700"
                      : "bg-slate-100 text-slate-500 hover:bg-brand-50 hover:text-brand-700",
                )}
              >
                {s.code}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-navy-900" /> Hub available</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-200" /> In research</span>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-card" aria-live="polite">
        <p className="text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">{tile.code}</p>
        <h3 className="mt-1 text-2xl font-bold text-ink">{tile.name}</h3>
        {profile ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2"><VerificationBadge level={profile.verification} /></div>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="flex items-center gap-1.5 font-semibold text-ink"><Landmark className="h-4 w-4 text-brand-500" aria-hidden="true" /> Agency</dt>
                <dd className="mt-1 text-muted">
                  <a href={profile.agency.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                    {profile.agency.name} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                  {profile.agency.division && <span className="block">{profile.agency.division}</span>}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Air permit programs</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {profile.programs.map((p) => (
                    <span key={p} className="rounded-md bg-canvas px-2 py-1 text-xs text-slate-700 ring-1 ring-line">{p}</span>
                  ))}
                </dd>
              </div>
              <div className="flex gap-6">
                <div><dt className="flex items-center gap-1.5 font-semibold text-ink"><FileText className="h-4 w-4 text-brand-500" aria-hidden="true" /> Forms</dt><dd className="text-muted">{profile.forms.length} official links</dd></div>
                <div><dt className="font-semibold text-ink">Guidance</dt><dd className="text-muted">{profile.guidance.length} official links</dd></div>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted">Last reviewed {profile.lastReviewed}</p>
            <Link href={`/states/${profile.slug}`} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
              Open {tile.name} hub <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">
              The {tile.name} hub is in research. We publish a state only after its programs, forms, and guidance are checked against the agency&apos;s own pages.
            </p>
            <Link href={`/states/${tile.slug}`} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
              View {tile.name} page <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
