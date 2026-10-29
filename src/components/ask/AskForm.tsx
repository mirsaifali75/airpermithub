"use client";

import { ArrowRight, Check, Copy, Mail, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { askEmail, askLimits, askRoles, askTopics, emptyAsk, getAskTopic, mailtoHref, type AskDraft } from "@/lib/ask";
import { site } from "@/lib/site";
import { field, labelCls } from "@/components/tools/shared";

const area = cn(field, "h-auto py-2 leading-relaxed");

/**
 * Builds a structured question and hands it to the visitor's own email app.
 * Nothing is sent or stored by AirPermitHub. The address is assembled in the
 * browser so it never appears in the static HTML.
 */
export function AskForm({ states, industries }: { states: string[]; industries: string[] }) {
  const uid = useId();
  const [d, setD] = useState<AskDraft>(emptyAsk());
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<AskDraft>) => setD((p) => ({ ...p, ...patch }));

  useEffect(() => {
    setAddress(`${site.askInbox}@${site.domain}`);
    const q = new URLSearchParams(window.location.search);
    const topic = q.get("topic");
    const page = q.get("page");
    setD((p) => ({ ...p, topic: topic && getAskTopic(topic) ? topic : p.topic, page: page?.startsWith("/") ? page.slice(0, 200) : p.page }));
  }, []);

  const topic = getAskTopic(d.topic);
  const correction = d.topic === "correction";
  const missing = !d.topic || !d.question.trim();
  const { subject, body } = askEmail(d, site.url);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (missing || !address) return;
    window.location.href = mailtoHref(address, subject, body);
  };
  const copy = () => {
    navigator.clipboard?.writeText(`To: ${address}\nSubject: ${subject}\n\n${body}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }, () => {});
  };

  return (
    <form onSubmit={send} noValidate className="space-y-6 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className="text-lg font-bold text-ink">Your question</h2>

      <div>
        <label htmlFor={`${uid}-topic`} className={labelCls}>Topic <span className="text-red-600">*</span></label>
        <select id={`${uid}-topic`} className={field} value={d.topic} onChange={(e) => set({ topic: e.target.value })} aria-invalid={tried && !d.topic} aria-describedby={tried && !d.topic ? `${uid}-topic-err` : undefined}>
          <option value="">Choose a topic</option>
          {askTopics.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
        </select>
        {tried && !d.topic && <p id={`${uid}-topic-err`} className="mt-1 text-xs font-medium text-red-600">Choose a topic.</p>}
      </div>

      {topic && topic.tryFirst.length > 0 && (
        <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-navy-800">
          <p className="font-semibold">These pages often answer this kind of question:</p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {topic.tryFirst.map((l) => <li key={l.href}><Link href={l.href} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">{l.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></li>)}
          </ul>
        </div>
      )}

      {correction && (
        <div>
          <label htmlFor={`${uid}-page`} className={labelCls}>Page with the error</label>
          <input id={`${uid}-page`} className={field} value={d.page} onChange={(e) => set({ page: e.target.value })} placeholder="/states/texas" />
        </div>
      )}

      <div>
        <label htmlFor={`${uid}-q`} className={labelCls}>{correction ? "What's wrong" : "Question"} <span className="text-red-600">*</span></label>
        <textarea
          id={`${uid}-q`}
          rows={6}
          maxLength={askLimits.question}
          className={area}
          value={d.question}
          onChange={(e) => set({ question: e.target.value })}
          aria-invalid={tried && !d.question.trim()}
          aria-describedby={`${uid}-q-help${tried && !d.question.trim() ? ` ${uid}-q-err` : ""}`}
          placeholder={correction ? "What the page says, and what it should say" : "Example: We're adding a compressor engine at a site that already operates under a permit by rule. What should we check before we install it?"}
        />
        <p id={`${uid}-q-help`} className="mt-1 flex justify-between gap-3 text-xs text-muted">
          <span>Name the equipment, its size, and what is changing.</span>
          <span aria-hidden="true">{d.question.length}/{askLimits.question}</span>
        </p>
        {tried && !d.question.trim() && <p id={`${uid}-q-err`} className="mt-1 text-xs font-medium text-red-600">Write your question.</p>}
      </div>

      <div>
        <label htmlFor={`${uid}-ctx`} className={labelCls}>{correction ? "Correct information and its source" : "What you've checked so far"} <span className="font-normal text-muted">(optional)</span></label>
        <textarea id={`${uid}-ctx`} rows={3} maxLength={askLimits.context} className={area} value={d.context} onChange={(e) => set({ context: e.target.value })} placeholder={correction ? "Link to the agency page or rule text" : "Rules or permit conditions you've read, your PTE estimate and how you got it"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-state`} className={labelCls}>State <span className="font-normal text-muted">(optional)</span></label>
          <select id={`${uid}-state`} className={field} value={d.state} onChange={(e) => set({ state: e.target.value })}>
            <option value="">Not specific to a state</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-ind`} className={labelCls}>Industry <span className="font-normal text-muted">(optional)</span></label>
          <select id={`${uid}-ind`} className={field} value={d.industry} onChange={(e) => set({ industry: e.target.value })}>
            <option value="">Choose one</option>
            {industries.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-role`} className={labelCls}>Your role <span className="font-normal text-muted">(optional)</span></label>
          <select id={`${uid}-role`} className={field} value={d.role} onChange={(e) => set({ role: e.target.value })}>
            <option value="">Choose one</option>
            {askRoles.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-by`} className={labelCls}>Needed by <span className="font-normal text-muted">(optional)</span></label>
          <input id={`${uid}-by`} type="date" className={field} value={d.neededBy} onChange={(e) => set({ neededBy: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-name`} className={labelCls}>Your name <span className="font-normal text-muted">(optional)</span></label>
          <input id={`${uid}-name`} className={field} value={d.name} autoComplete="name" onChange={(e) => set({ name: e.target.value })} />
        </div>
      </div>

      {!correction && (
        <label className="flex items-start gap-3 rounded-xl border border-line px-4 py-3 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={d.publicOk} onChange={(e) => set({ publicOk: e.target.checked })} />
          <span>AirPermitHub may answer this publicly as a guide, with names, permit numbers, and locations removed.</span>
        </label>
      )}

      <p className="flex gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Leave out confidential business information. Answers are general information, not legal advice, and don&apos;t create a consulting relationship. For a deadline you can&apos;t miss, contact your permitting agency.</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit"><Mail className="h-4 w-4" aria-hidden="true" /> Open in my email app</Button>
        <Button type="button" variant="subtle" onClick={copy} disabled={missing}>
          {copied ? <Check className="h-4 w-4 text-eco-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          <span aria-live="polite">{copied ? "Copied" : "Copy question"}</span>
        </Button>
      </div>
      <p className="text-xs text-muted">
        Your email app opens with the question filled in, and nothing is sent until you press Send there. No email app? Copy the question and send it to{" "}
        {address ? <span className="font-semibold text-ink">{address}</span> : "the address shown here once the page loads"}.
      </p>
    </form>
  );
}
