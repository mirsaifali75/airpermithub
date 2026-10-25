"use client";

import { ArrowLeft, ArrowRight, Calculator, Check, CircleHelp, MapPin, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ApplicabilityBadge, CitationBadge, VerificationBadge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Notices";
import { cn } from "@/lib/cn";
import { equipmentOptions, facilityTypesByIndustry, permitFinderIndustries } from "@/lib/data/equipment";
import type { StateProfileSummary } from "@/lib/data/state-profiles";
import { stateTiles } from "@/lib/data/states";
import { screen, type ScreeningItem } from "@/lib/screening";

const steps = ["Location", "Industry", "Facility type", "Equipment", "Potential pathways"] as const;

interface FormState {
  state: string;
  county: string;
  location: string;
  industry: string;
  facilityType: string;
  equipment: string[];
}

const initial: FormState = { state: "", county: "", location: "", industry: "", facilityType: "", equipment: [] };

export function PermitFinderWizard({ profiles }: { profiles: StateProfileSummary[] }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const ids = useId();
  const sortedStates = useMemo(() => [...stateTiles].sort((a, b) => a.name.localeCompare(b.name)), []);
  const liveSlugs = new Set(profiles.map((p) => p.slug));

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
  };

  const validate = (): string | null => {
    if (step === 0 && !form.state) return "Select the state where the facility is located.";
    if (step === 1 && !form.industry) return "Select an industry.";
    if (step === 2 && !form.facilityType) return "Select a facility type.";
    if (step === 3 && form.equipment.length === 0) return "Select at least one piece of equipment.";
    return null;
  };

  const next = () => {
    const e = validate();
    if (e) return setError(e);
    setStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const result = step === 4 ? screen(form, profiles) : null;
  const profile = profiles.find((p) => p.slug === form.state);
  const stateName = stateTiles.find((s) => s.slug === form.state)?.name;

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      {/* Stepper */}
      <nav aria-label="Permit Finder steps" className="lg:sticky lg:top-24 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1">
          {steps.map((label, idx) => {
            const done = idx < step;
            const current = idx === step;
            return (
              <li key={label} className="shrink-0">
                <button
                  disabled={idx > step}
                  onClick={() => setStep(idx)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    current ? "bg-white font-semibold text-ink shadow-card ring-1 ring-line" : "text-muted",
                    done && "hover:bg-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      done ? "bg-eco-500 text-white" : current ? "bg-brand-500 text-white" : "bg-slate-200 text-slate-500",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" aria-hidden="true" /> : idx + 1}
                  </span>
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8">
        {step === 0 && (
          <fieldset>
            <legend className="text-2xl font-bold text-ink">Where is the facility?</legend>
            <p className="mt-1 text-sm text-muted">Jurisdiction decides which agency and rules apply, so start here.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={`${ids}-state`} className="mb-1.5 block text-sm font-semibold text-ink">State <span className="text-red-600">*</span></label>
                <select
                  id={`${ids}-state`}
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  aria-invalid={!!error && !form.state}
                  aria-describedby={error ? `${ids}-err` : undefined}
                  className="h-12 w-full rounded-xl border border-line bg-white px-3 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                >
                  <option value="">Select a state</option>
                  {sortedStates.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}{liveSlugs.has(s.slug) ? "" : " (hub in research)"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${ids}-county`} className="mb-1.5 block text-sm font-semibold text-ink">County</label>
                <input
                  id={`${ids}-county`}
                  value={form.county}
                  onChange={(e) => set("county", e.target.value)}
                  placeholder="e.g., county name"
                  className="h-12 w-full rounded-xl border border-line px-3 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${ids}-loc`} className="mb-1.5 block text-sm font-semibold text-ink">
                  Coordinates or address <span className="font-normal text-muted">(optional)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute top-3.5 left-3 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <input
                    id={`${ids}-loc`}
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="e.g., 32.0000, -103.0000"
                    className="h-12 w-full rounded-xl border border-line pr-3 pl-10 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted">Used later for attainment-area and local-jurisdiction lookups.</p>
              </div>
            </div>
            {form.state && !liveSlugs.has(form.state) && (
              <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                We haven&apos;t published a verified hub for {stateName} yet. You&apos;ll still get federal screening and general next steps.
              </p>
            )}
          </fieldset>
        )}

        {step === 1 && (
          <ChoiceStep
            legend="Select industry"
            hint="Industry narrows the facility types and rules worth reviewing."
            options={[...permitFinderIndustries]}
            value={form.industry}
            onChange={(v) => setForm((f) => ({ ...f, industry: v, facilityType: "" }))}
          />
        )}

        {step === 2 && (
          <ChoiceStep
            legend="Select facility type"
            hint={`Common ${form.industry} facility types.`}
            options={facilityTypesByIndustry[form.industry] ?? ["Other"]}
            value={form.facilityType}
            onChange={(v) => set("facilityType", v)}
          />
        )}

        {step === 3 && (
          <fieldset>
            <legend className="text-2xl font-bold text-ink">Select equipment</legend>
            <p className="mt-1 text-sm text-muted">Choose everything on site. Selected: {form.equipment.length}</p>
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {equipmentOptions.map((eq) => {
                const checked = form.equipment.includes(eq);
                return (
                  <label
                    key={eq}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-500",
                      checked ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-line hover:border-brand-200",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => set("equipment", checked ? form.equipment.filter((e) => e !== eq) : [...form.equipment, eq])}
                    />
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", checked ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300")} aria-hidden="true">
                      {checked && <Check className="h-3.5 w-3.5" />}
                    </span>
                    {eq}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {step === 4 && result && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">Screening result</p>
                <h2 className="mt-1 text-2xl font-bold text-ink">Potential pathways to review</h2>
                <p className="mt-1 text-sm text-muted">
                  {form.facilityType} · {form.industry} · {stateName}{form.county ? `, ${form.county}` : ""} · {form.equipment.length} equipment types
                </p>
              </div>
              {profile && <VerificationBadge level={profile.verification} />}
            </div>

            <Disclaimer variant="screening" className="mt-5" />

            <ResultGroup title={profile ? `${profile.agency} authorization options` : "Authorization options"} items={result.pathways} />
            <ResultGroup
              title="Federal programs worth screening for selected equipment"
              items={result.federalRules}
              empty="No equipment-specific federal programs were flagged for this selection. That is not a conclusion that none apply."
            />

            <section className="mt-8 rounded-2xl bg-canvas p-5">
              <h3 className="flex items-center gap-2 font-semibold text-ink"><CircleHelp className="h-5 w-5 text-amber-600" aria-hidden="true" /> Information needed before conclusions</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {result.dataGaps.map((g) => (
                  <li key={g} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />{g}</li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/calculators" className={buttonClass("primary", "md")}><Calculator className="h-4 w-4" aria-hidden="true" /> Calculate potential emissions</Link>
                {profile && <Link href={`/states/${profile.slug}`} className={buttonClass("subtle", "md")}>Open {stateName} hub</Link>}
              </div>
            </section>
          </div>
        )}

        {error && (
          <p id={`${ids}-err`} role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
          {step > 0 ? (
            <Button variant="subtle" onClick={() => { setStep((s) => s - 1); setError(null); }}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Button>
          ) : <span />}
          {step < 4 ? (
            <Button onClick={next}>
              {step === 3 ? "See potential pathways" : "Continue"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button variant="subtle" onClick={() => { setForm(initial); setStep(0); }}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Start over
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceStep({ legend, hint, options, value, onChange }: { legend: string; hint: string; options: string[]; value: string; onChange: (v: string) => void }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-2xl font-bold text-ink">{legend}</legend>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {options.map((o) => (
          <label
            key={o}
            className={cn(
              "flex min-h-14 cursor-pointer items-center rounded-xl border px-4 py-3 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-500",
              value === o ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500" : "border-line text-ink hover:border-brand-200",
            )}
          >
            <input type="radio" name={name} className="sr-only" checked={value === o} onChange={() => onChange(o)} />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ResultGroup({ title, items, empty }: { title: string; items: ScreeningItem[]; empty?: string }) {
  return (
    <section className="mt-8">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((it) => (
            <li key={it.title} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{it.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {it.program}
                    {it.citation && <CitationBadge>{it.citation}</CitationBadge>}
                  </p>
                </div>
                <ApplicabilityBadge status={it.status} />
              </div>
              <p className="mt-2.5 text-sm text-slate-700"><span className="font-medium text-ink">Why it may apply: </span>{it.why}</p>
              <p className="mt-1.5 text-sm text-slate-700"><span className="font-medium text-ink">Further review: </span>{it.nextStep}</p>
              {it.href && (
                <Link href={it.href} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                  Read more <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
