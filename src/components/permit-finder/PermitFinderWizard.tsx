"use client";

import {
  ArrowLeft, ArrowRight, Building2, Calculator, Check, CircleHelp, Cog, Container, Droplets, Factory, Flame, FlaskConical, Fuel,
  Gauge, Lightbulb, MapPin, Mountain, Printer, Recycle, RotateCcw, Wind, Zap, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ApplicabilityBadge, CitationBadge, VerificationBadge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Notices";
import { cn } from "@/lib/cn";
import { equipmentOptions, facilityTypesByIndustry, permitFinderIndustries } from "@/lib/data/equipment";
import type { StateProfileSummary } from "@/lib/data/state-profiles";
import { stateTiles } from "@/lib/data/states";
import { screen, type ScreeningInput, type ScreeningItem } from "@/lib/screening";

const steps = ["Facility", "Location", "Emissions", "Operations", "Results"] as const;

const industryIcon: Record<(typeof permitFinderIndustries)[number], { icon: LucideIcon; label: string }> = {
  "Oil & Gas": { icon: Droplets, label: "Oil & Gas Production" },
  Midstream: { icon: Fuel, label: "Midstream" },
  Refinery: { icon: Factory, label: "Refinery" },
  "Power Generation": { icon: Zap, label: "Power Generation" },
  Chemical: { icon: FlaskConical, label: "Chemical Plant" },
  Manufacturing: { icon: Building2, label: "Manufacturing" },
  Aggregates: { icon: Mountain, label: "Mining & Aggregates" },
  Waste: { icon: Recycle, label: "Waste & Landfills" },
  "Other Industrial": { icon: Cog, label: "Other Industrial" },
};

const equipmentIcon: Partial<Record<(typeof equipmentOptions)[number], LucideIcon>> = {
  "Storage Tanks": Container,
  Engines: Cog,
  Compressors: Gauge,
  Heaters: Flame,
  "Heater Treaters": Flame,
  Flares: Flame,
  "Pneumatic Controllers": Wind,
  "Pneumatic Pumps": Wind,
  Fugitives: Wind,
  Generators: Zap,
};

const controlOptions = ["Vapor recovery unit", "Flare or enclosed combustor", "Catalytic converter / SCR", "Other control", "None"];

interface FormState extends Required<Pick<ScreeningInput, "state" | "industry" | "facilityType" | "equipment">> {
  county: string;
  location: string;
  facilityName: string;
  project: NonNullable<ScreeningInput["project"]> | "";
  existingAuthorization: NonNullable<ScreeningInput["existingAuthorization"]> | "";
  pteKnown: NonNullable<ScreeningInput["pteKnown"]> | "";
  controls: string[];
  schedule: NonNullable<ScreeningInput["schedule"]> | "";
}

const initial: FormState = {
  state: "", county: "", location: "", facilityName: "", industry: "", facilityType: "", equipment: [],
  project: "", existingAuthorization: "", pteKnown: "", controls: [], schedule: "",
};

const field = "h-12 w-full rounded-xl border border-line bg-white px-3 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none";

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
  const toggle = (k: "equipment" | "controls", v: string) =>
    setForm((f) => {
      const list = f[k];
      let next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
      if (k === "controls") next = v === "None" ? (list.includes("None") ? [] : ["None"]) : next.filter((x) => x !== "None");
      return { ...f, [k]: next };
    });

  const validate = (): string | null => {
    if (step === 0 && !form.industry) return "Select the type of facility.";
    if (step === 0 && !form.facilityType) return "Select a facility type.";
    if (step === 1 && !form.state) return "Select the state where the facility is located.";
    if (step === 2 && form.equipment.length === 0) return "Select at least one emission source.";
    if (step === 3 && !form.project) return "Tell us whether this is a new facility, a modification, or an existing site.";
    return null;
  };

  const go = (to: number) => {
    setStep(to);
    setError(null);
    document.getElementById("finder-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const next = () => {
    const e = validate();
    if (e) return setError(e);
    go(Math.min(step + 1, steps.length - 1));
  };

  const input: ScreeningInput = {
    ...form,
    project: form.project || undefined,
    existingAuthorization: form.existingAuthorization || undefined,
    pteKnown: form.pteKnown || undefined,
    schedule: form.schedule || undefined,
  };
  const result = step === 4 ? screen(input, profiles) : null;
  const profile = profiles.find((p) => p.slug === form.state);
  const stateName = stateTiles.find((s) => s.slug === form.state)?.name;

  return (
    <div id="finder-top" className="scroll-mt-24 rounded-2xl border border-line bg-white shadow-card">
      {/* Stepper */}
      <nav aria-label="Permit Finder steps" className="border-b border-line px-4 py-5 sm:px-8">
        <ol className="flex items-start">
          {steps.map((label, idx) => {
            const done = idx < step;
            const current = idx === step;
            return (
              <li key={label} className="relative flex flex-1 flex-col items-center">
                {idx > 0 && <span aria-hidden="true" className={cn("absolute top-4 right-1/2 h-0.5 w-full", idx <= step ? "bg-brand-500" : "bg-line")} />}
                <button
                  disabled={idx > step}
                  onClick={() => go(idx)}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Step ${idx + 1}: ${label}${done ? " (done)" : ""}`}
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ring-4 ring-white transition-colors",
                    done ? "bg-brand-500 text-white" : current ? "bg-brand-500 text-white shadow-[0_0_0_6px_rgb(30_111_255/0.15)]" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden="true" /> : idx + 1}
                </button>
                <span className={cn("mt-2 text-xs font-semibold sm:text-sm", current ? "text-ink" : "text-muted")}>{label}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="p-5 sm:p-8">
        {step === 0 && (
          <div className="space-y-7">
            <fieldset>
              <legend className="text-xl font-bold text-ink">Facility type</legend>
              <p className="mt-1 text-sm text-muted">What kind of facility is this? It narrows the programs and rules worth reviewing.</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {permitFinderIndustries.map((ind) => {
                  const { icon: Icon, label } = industryIcon[ind];
                  const checked = form.industry === ind;
                  return (
                    <label
                      key={ind}
                      className={cn(
                        "flex cursor-pointer flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-500",
                        checked ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500" : "border-line text-ink hover:border-brand-200 hover:bg-canvas",
                      )}
                    >
                      <input type="radio" name={`${ids}-ind`} className="sr-only" checked={checked} onChange={() => setForm((f) => ({ ...f, industry: ind, facilityType: "" }))} />
                      <Icon className={cn("h-8 w-8", checked ? "text-brand-600" : "text-navy-700")} strokeWidth={1.5} aria-hidden="true" />
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={`${ids}-ft`} className="mb-1.5 block text-sm font-semibold text-ink">Facility subtype <span className="text-red-600">*</span></label>
                <select id={`${ids}-ft`} value={form.facilityType} onChange={(e) => set("facilityType", e.target.value)} disabled={!form.industry} className={cn(field, "disabled:bg-canvas")}>
                  <option value="">{form.industry ? "Select facility type" : "Choose a facility type above first"}</option>
                  {(facilityTypesByIndustry[form.industry] ?? []).map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`${ids}-fn`} className="mb-1.5 block text-sm font-semibold text-ink">Facility name <span className="font-normal text-muted">(optional)</span></label>
                <input id={`${ids}-fn`} value={form.facilityName} onChange={(e) => set("facilityName", e.target.value)} placeholder="Enter facility name" className={field} />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <fieldset>
            <legend className="text-xl font-bold text-ink">Where is the facility?</legend>
            <p className="mt-1 text-sm text-muted">Jurisdiction decides which agency and rules apply.</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={`${ids}-state`} className="mb-1.5 block text-sm font-semibold text-ink">State <span className="text-red-600">*</span></label>
                <select id={`${ids}-state`} value={form.state} onChange={(e) => set("state", e.target.value)} className={field}>
                  <option value="">Select state</option>
                  {sortedStates.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.name}{liveSlugs.has(s.slug) ? "" : " (hub in research)"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${ids}-county`} className="mb-1.5 block text-sm font-semibold text-ink">County <span className="font-normal text-muted">(optional)</span></label>
                <input id={`${ids}-county`} value={form.county} onChange={(e) => set("county", e.target.value)} placeholder="Select or type county" className={field} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${ids}-loc`} className="mb-1.5 block text-sm font-semibold text-ink">Coordinates or address <span className="font-normal text-muted">(optional)</span></label>
                <div className="relative">
                  <MapPin className="absolute top-3.5 left-3 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <input id={`${ids}-loc`} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g., 32.0000, -103.0000" className={cn(field, "pl-10")} />
                </div>
                <p className="mt-1.5 text-xs text-muted">Kept in your browser only. Attainment-area and local-agency lookups come in a later release.</p>
              </div>
            </div>
            {profile && (
              <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-canvas px-4 py-3 text-sm">
                <span className="font-semibold text-ink">{profile.agency}</span>
                <VerificationBadge level={profile.verification} />
                <span className="text-muted">{profile.permitTypes.length} authorization programs on file</span>
              </div>
            )}
            {form.state && !liveSlugs.has(form.state) && (
              <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                We haven&apos;t published a hub for {stateName} yet. You&apos;ll still get federal screening and general next steps.
              </p>
            )}
          </fieldset>
        )}

        {step === 2 && (
          <div className="space-y-7">
            <fieldset>
              <legend className="text-xl font-bold text-ink">Emission sources on site</legend>
              <p className="mt-1 text-sm text-muted">Choose every source type at the facility. Selected: {form.equipment.length}</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {equipmentOptions.map((eq) => {
                  const checked = form.equipment.includes(eq);
                  const Icon = equipmentIcon[eq] ?? Cog;
                  return (
                    <label key={eq} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-500", checked ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-line hover:border-brand-200")}>
                      <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle("equipment", eq)} />
                      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", checked ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300")} aria-hidden="true">
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      {eq}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <Choice
              legend="Have you calculated potential to emit (PTE)?"
              hint="PTE drives most applicability decisions. You can calculate it with the Emission Calculators."
              value={form.pteKnown}
              onChange={(v) => set("pteKnown", v as FormState["pteKnown"])}
              options={[{ v: "yes", l: "Yes, I have PTE estimates" }, { v: "no", l: "Not yet" }]}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-7">
            <Choice
              legend="What kind of project is this?"
              required
              value={form.project}
              onChange={(v) => set("project", v as FormState["project"])}
              options={[{ v: "new", l: "New facility" }, { v: "modification", l: "Modification or expansion" }, { v: "existing", l: "Existing facility review" }]}
            />
            <Choice
              legend="Does the site already hold an air authorization?"
              value={form.existingAuthorization}
              onChange={(v) => set("existingAuthorization", v as FormState["existingAuthorization"])}
              options={[{ v: "yes", l: "Yes" }, { v: "no", l: "No" }, { v: "unsure", l: "Not sure" }]}
            />
            <fieldset>
              <legend className="text-base font-bold text-ink">Emission controls planned or installed</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {controlOptions.map((c) => {
                  const checked = form.controls.includes(c);
                  return (
                    <label key={c} className={cn("cursor-pointer rounded-full border px-3.5 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-500", checked ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-line hover:border-brand-200")}>
                      <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle("controls", c)} />
                      {c}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <Choice
              legend="Operating schedule"
              value={form.schedule}
              onChange={(v) => set("schedule", v as FormState["schedule"])}
              options={[{ v: "continuous", l: "Continuous (full year)" }, { v: "limited", l: "Limited hours or seasonal" }]}
            />
          </div>
        )}

        {step === 4 && result && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">Screening result</p>
                <h2 className="mt-1 text-2xl font-bold text-ink">{form.facilityName ? `${form.facilityName}: potential pathways` : "Potential pathways to review"}</h2>
                <p className="mt-1 text-sm text-muted">
                  {form.facilityType} · {industryIcon[form.industry as keyof typeof industryIcon]?.label} · {stateName}{form.county ? `, ${form.county}` : ""} · {form.equipment.length} source types
                </p>
              </div>
              <div className="flex items-center gap-2">
                {profile && <VerificationBadge level={profile.verification} />}
                <Button variant="subtle" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print</Button>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-3">
              {[
                { k: "Potentially applicable", v: [...result.pathways, ...result.federalRules].filter((i) => i.status === "potentially-applicable").length, c: "text-brand-600" },
                { k: "Further review required", v: [...result.pathways, ...result.federalRules].filter((i) => i.status === "more-info-needed").length, c: "text-amber-600" },
                { k: "Information gaps", v: result.dataGaps.length, c: "text-slate-600" },
              ].map(({ k, v, c }) => (
                <div key={k} className="rounded-xl border border-line px-4 py-3">
                  <dd className={cn("font-display text-2xl font-extrabold", c)}>{v}</dd>
                  <dt className="text-xs text-muted">{k}</dt>
                </div>
              ))}
            </dl>

            <Disclaimer variant="screening" className="mt-5" />

            <ResultGroup title={profile ? `${profile.agency} authorization options` : "Authorization options"} items={result.pathways} />
            <ResultGroup
              title="Federal programs worth screening for selected equipment"
              items={result.federalRules}
              empty="No equipment-specific federal programs were flagged for this selection. That is not a conclusion that none apply."
            />

            {result.considerations.length > 0 && (
              <section className="mt-8">
                <h3 className="text-lg font-semibold text-ink">Considerations from your answers</h3>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {result.considerations.map((c) => (
                    <li key={c.title} className="rounded-xl border border-line bg-brand-50/40 p-4">
                      <p className="flex items-center gap-2 font-semibold text-ink"><Lightbulb className="h-4 w-4 text-brand-500" aria-hidden="true" />{c.title}</p>
                      <p className="mt-1.5 text-sm text-slate-700">{c.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-8 rounded-2xl bg-canvas p-5">
              <h3 className="flex items-center gap-2 font-semibold text-ink"><CircleHelp className="h-5 w-5 text-amber-600" aria-hidden="true" /> Information needed before conclusions</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {result.dataGaps.map((g) => (
                  <li key={g} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />{g}</li>
                ))}
              </ul>
              <div className="no-print mt-5 flex flex-wrap gap-3">
                <Link href="/calculators" className={buttonClass("primary", "md")}><Calculator className="h-4 w-4" aria-hidden="true" /> Calculate potential emissions</Link>
                {profile && <Link href={`/states/${profile.slug}`} className={buttonClass("subtle", "md")}>Open {stateName} hub</Link>}
              </div>
            </section>
          </div>
        )}

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

        <div className="no-print mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
          {step > 0 ? (
            <Button variant="subtle" onClick={() => go(step - 1)}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</Button>
          ) : <span />}
          {step < 4 ? (
            <Button onClick={next}>{step === 3 ? "See results" : "Next Step"} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
          ) : (
            <Button variant="subtle" onClick={() => { setForm(initial); go(0); }}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Start over</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Choice({ legend, hint, options, value, onChange, required }: { legend: string; hint?: string; options: { v: string; l: string }[]; value: string; onChange: (v: string) => void; required?: boolean }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-base font-bold text-ink">{legend} {required && <span className="text-red-600">*</span>}</legend>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <label key={o.v} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-500", value === o.v ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500" : "border-line text-ink hover:border-brand-200")}>
            <input type="radio" name={name} className="sr-only" checked={value === o.v} onChange={() => onChange(o.v)} />
            <span className={cn("flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border", value === o.v ? "border-brand-500" : "border-slate-300")} aria-hidden="true">
              {value === o.v && <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />}
            </span>
            {o.l}
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
                <div className="min-w-0">
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
                <Link href={it.href} className="no-print mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
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
