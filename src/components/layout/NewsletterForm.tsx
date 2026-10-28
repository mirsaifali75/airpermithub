"use client";

import { ArrowRight, MailCheck } from "lucide-react";
import { useId, useState } from "react";

/**
 * Newsletter sign-up. There is no mailing-list provider yet, so the form
 * validates the address and says plainly that nothing was stored.
 * Phase 2: POST to /api/v1/newsletter backed by the chosen provider.
 */
export function NewsletterForm() {
  const id = useId();
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/80">
        <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-eco-500" aria-hidden="true" />
        Thanks. Newsletter sign-ups open with account launch; your address was not stored yet.
      </p>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="flex gap-2"
    >
      <label htmlFor={`${id}-email`} className="sr-only">Email address</label>
      <input
        id={`${id}-email`}
        type="email"
        required
        placeholder="Enter your email"
        className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none"
      />
      <button type="submit" className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">
        Subscribe <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
