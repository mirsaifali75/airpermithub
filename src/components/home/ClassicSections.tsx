import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import reviewPhoto from "../../../public/images/site/09-engineer-review.webp";
import ogiPhoto from "../../../public/images/site/02-ogi-inspection.webp";
import { buttonClass } from "@/components/ui/Button";

/**
 * Home sections added with the Option E (classic) design, MIR approved 2026-11-05.
 * They sit alongside the earlier home sections; nothing was taken out.
 */

export function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return <p className={`text-xs font-semibold tracking-[0.24em] uppercase ${tone === "dark" ? "text-gold-300" : "text-gold-700"}`}>{children}</p>;
}

export function TrustRow({ stateCount }: { stateCount: number }) {
  const items = [
    { big: stateCount >= 51 ? "50 + DC" : String(stateCount), small: "State air agency hubs" },
    { big: "Every step", small: "Shown in each calculation" },
    { big: "Official", small: "Government sources only" },
    { big: "Monthly", small: "Source check on citations" },
  ];
  return (
    <section className="bg-canvas pt-16 pb-6 sm:pt-20" aria-label="What sets AirPermitHub apart">
      <div className="container-page">
        <dl className="grid grid-cols-2 border-y border-rule text-center lg:grid-cols-4">
          {items.map((i) => (
            <div key={i.small} className="flex flex-col-reverse border-rule px-3 py-6 sm:py-7 max-lg:[&:nth-child(even)]:border-l max-lg:[&:nth-child(n+3)]:border-t lg:[&:not(:first-child)]:border-l">
              <dt className="mt-1 text-xs tracking-[0.1em] text-gold-700 uppercase">{i.small}</dt>
              <dd className="font-display text-3xl font-semibold text-navy-900 sm:text-[2.75rem]">{i.big}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const coverage = [
  { n: "I", title: "Permit screening", body: "The federal and state programs worth reviewing for a facility, each with its citation.", href: "/permit-finder" },
  { n: "II", title: "Emission calculations", body: "Engines, heaters, flares, tanks and fugitives, with every step shown.", href: "/calculators" },
  { n: "III", title: "Federal regulations", body: "NSPS, NESHAP, Title V, NSR and PSD, built from the eCFR text.", href: "/regulations" },
  { n: "IV", title: "Compliance tracking", body: "Testing, monitoring, reporting and certification deadlines from each permit.", href: "/compliance" },
  { n: "V", title: "Practitioner guides", body: "Plain-language guides that point to the governing text.", href: "/resources" },
];

export function WhatWeCover() {
  return (
    <section className="bg-canvas py-16 sm:py-24" aria-labelledby="cover-heading">
      <div className="container-page grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div>
          <Eyebrow>What we cover</Eyebrow>
          <h2 id="cover-heading" className="mt-3 text-4xl leading-[1.08] text-navy-900 sm:text-5xl">Everything an air permit asks of you, in one place</h2>
          <div className="mt-8 border-8 border-white shadow-[0_1px_0_var(--color-rule)]">
            <Image src={reviewPhoto} alt="Engineer reviewing permit records on a laptop in a field truck" sizes="(min-width: 1024px) 520px, 100vw" className="h-64 w-full object-cover sm:h-[21rem]" />
          </div>
        </div>
        <ol className="self-start">
          {coverage.map((c, i) => (
            <li key={c.n} className={`border-t border-rule ${i === coverage.length - 1 ? "border-b" : ""}`}>
              <Link href={c.href} className="group flex gap-6 py-6">
                <span aria-hidden="true" className="w-12 shrink-0 font-display text-4xl leading-none text-gold-700">{c.n}</span>
                <span>
                  <span className="block font-display text-[1.6rem] leading-tight font-semibold text-navy-900 group-hover:text-gold-700">{c.title}</span>
                  <span className="mt-1.5 block text-[0.95rem] leading-relaxed text-slate-600">{c.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Navy State Explorer band. The full interactive map stays on the page; signing in keeps your states. */
export function MembersMap({ children }: { children: ReactNode }) {
  return (
    <section className="bg-navy-900 py-16 text-white sm:py-24" aria-labelledby="states-heading">
      <div className="container-page">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end lg:gap-16">
          <div>
            <Eyebrow tone="dark">State Explorer · Members</Eyebrow>
            <h2 id="states-heading" className="mt-3 text-4xl leading-[1.08] sm:text-5xl">Every state. One map.</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Select any of the 50 states or DC to open its air agency, permit programs and official forms, each with its verification status.
            </p>
          </div>
          <div>
            <ul className="space-y-2.5 text-[0.95rem] text-gold-200">
              <li>— Agency, permit types and forms for every state</li>
              <li>— Links to the official agency pages</li>
              <li>— Last reviewed date on each state</li>
            </ul>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" className={buttonClass("subtle", "lg")}>Sign up free for the full map</Link>
              <Link href="/states" className={buttonClass("outline-light", "lg")}>All states <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
        <div className="relative mt-10 border border-gold-300 bg-canvas p-3 text-ink sm:p-6">
          <span className="absolute top-0 right-0 z-10 bg-navy-900 px-3 py-1.5 text-xs font-semibold tracking-[0.06em] text-white">Full state hubs with a free account</span>
          {children}
        </div>
      </div>
    </section>
  );
}

export function StatementBand() {
  return (
    <section className="relative isolate overflow-hidden bg-navy-900 py-24 text-white sm:py-32">
      <Image src={ogiPhoto} alt="" fill sizes="100vw" className="-z-10 object-cover" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-navy-950/60" />
      <figure className="container-page max-w-4xl text-center">
        <blockquote className="font-display text-3xl leading-snug italic sm:text-[2.9rem]">
          “Every number shows its formula, its factor, and the rule it comes from.”
        </blockquote>
        <figcaption className="mt-5 text-xs tracking-[0.24em] text-gold-200 uppercase">The AirPermitHub standard</figcaption>
      </figure>
    </section>
  );
}

export function HowWeVerify() {
  return (
    <section className="border-y border-rule bg-parchment">
      <div className="container-page max-w-3xl py-16 text-center sm:py-20">
        <h2 className="text-4xl text-navy-900 sm:text-[2.75rem]">How we verify</h2>
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
          Every regulatory quote, threshold and citation on AirPermitHub is checked against the official government source each month, and its status is shown on the page.
        </p>
        <Link href="/verification" className="mt-5 inline-flex items-center gap-1.5 font-semibold text-gold-700 hover:text-navy-900">
          Read about our method <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
