"use client";

import { BookMarked, Download, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { csvFileName, downloadText, useStoredState } from "@/components/tools/shared";
import { Button } from "@/components/ui/Button";
import { factorsCsv, MY_FACTORS_STORE, type EmissionFactorRecord } from "@/lib/calc/factors";

/** Factors the user saved from the calculators, with their citations. */
export function MyFactors({ methodNames }: { methodNames: Record<string, string> }) {
  const [factors, setFactors] = useStoredState<EmissionFactorRecord[]>(MY_FACTORS_STORE, []);

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card" aria-labelledby="my-factors">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="my-factors" className="flex items-center gap-2 text-lg font-bold text-ink"><BookMarked className="h-5 w-5 text-brand-500" aria-hidden="true" /> My factors</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Factors you save from a calculator, each with the reference you cited. Pick them from the list under any factor field. Kept in this browser until accounts launch.
          </p>
        </div>
        <Button size="sm" variant="subtle" onClick={() => downloadText(csvFileName("my-factors"), factorsCsv(factors))} disabled={!factors.length}>
          <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
        </Button>
      </div>
      {factors.length === 0 ? (
        <p className="mt-4 rounded-xl bg-canvas px-4 py-4 text-sm text-muted">
          None saved yet. In a calculator, enter a factor and its reference, then choose <strong>Save to My factors</strong>.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">Saved emission factors</caption>
            <thead className="bg-canvas text-left text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="px-3 py-2.5">Calculator</th>
                <th scope="col" className="px-3 py-2.5">Pollutant</th>
                <th scope="col" className="px-3 py-2.5 text-right">Value</th>
                <th scope="col" className="px-3 py-2.5">Reference</th>
                <th scope="col" className="px-3 py-2.5"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {factors.map((f) => (
                <tr key={f.id}>
                  <td className="px-3 py-2.5">
                    <Link href={`/calculators/${f.method}`} className="font-medium text-brand-700 hover:underline">{methodNames[f.method] ?? f.method}</Link>
                    <span className="block text-xs text-muted">{f.sourceCategory}</span>
                  </td>
                  <td className="px-3 py-2.5">{f.pollutant}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">{f.value} <span className="text-muted">{f.units}</span></td>
                  <td className="px-3 py-2.5 text-xs">
                    {f.referenceDocument}{f.sectionTable && `, ${f.sectionTable}`}{f.revisionDate && ` (${f.revisionDate})`}{f.rating && ` · Rating ${f.rating}`}
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center gap-1 text-brand-600 hover:underline">
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" /> Source
                      </a>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <button type="button" onClick={() => setFactors((list) => list.filter((x) => x.id !== f.id))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${f.pollutant} factor ${f.value} ${f.units}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
