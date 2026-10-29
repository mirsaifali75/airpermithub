import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { toolIcons } from "@/components/tools/ToolIcon";
import { coreTools } from "@/lib/tools/catalog";

/** Home section: practitioner tools, each led by the everyday problem it answers. */
export function ProblemSolvers() {
  const tools = coreTools.filter((t) => t.slug !== "glossary");
  return (
    <section className="relative isolate overflow-hidden bg-navy-950 py-16 text-white sm:py-20" aria-labelledby="solvers-heading">
      <div aria-hidden="true" className="absolute -top-32 left-1/2 -z-10 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="container-page">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-bold tracking-[0.18em] text-cyan-400 uppercase">Practitioner tools</p>
            <h2 id="solvers-heading" className="text-2xl font-bold sm:text-3xl">Built for the Problems You Hit Every Week</h2>
            <p className="mt-2 text-white/75">The questions that eat an air permitting professional&apos;s week, each with a tool that shows its math and cites the rule.</p>
          </div>
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:text-white">All tools <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => {
            const Icon = toolIcons[t.icon];
            return (
              <li key={t.slug}>
                <Link href={t.href} className="group glass-dark flex h-full flex-col rounded-2xl p-5 transition-colors hover:bg-white/10">
                  <p className="flex-1 text-[0.95rem] text-white/85">&ldquo;{t.problem}&rdquo;</p>
                  <span className="mt-4 flex items-center gap-2.5 border-t border-white/10 pt-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white"><Icon className="h-4.5 w-4.5" aria-hidden="true" /></span>
                    <span className="font-semibold text-white">{t.name}</span>
                    <ArrowRight className="ml-auto h-4 w-4 text-cyan-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
