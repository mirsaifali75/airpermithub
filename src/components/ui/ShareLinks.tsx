"use client";

import { Check, Link2, Mail } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";

const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700";

/** Share a page on LinkedIn or by email, or copy its link. Plain links: no third-party scripts. */
export function ShareLinks({ path, title, className }: { path: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${site.url}${path}`;
  const enc = encodeURIComponent;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm font-semibold text-ink">Share</span>
      <a className={btn} href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" /></svg>
        LinkedIn
      </a>
      <a className={btn} href={`mailto:?subject=${enc(title)}&body=${enc(`${title}\n${url}`)}`}>
        <Mail className="h-4 w-4" aria-hidden="true" /> Email
      </a>
      <button
        type="button"
        className={btn}
        onClick={() => {
          navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }, () => {});
        }}
      >
        {copied ? <Check className="h-4 w-4 text-eco-600" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
        <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
      </button>
    </div>
  );
}
