import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { accountsEnabled } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

/**
 * Wraps a tool's interactive part. While accounts are off (the live site
 * today) it renders the tool unchanged. Once they're on, signed-in users get
 * the tool and everyone else gets `preview`; the rest of the page (method
 * notes, rule text, sources) stays public either way.
 */
export async function ToolGate({ preview, name, next, children }: { preview?: ReactNode; name: string; next: string; children: ReactNode }) {
  if (!accountsEnabled || (await getSession())) return <>{children}</>;
  return <>{preview ?? <SignUpToUse name={name} next={next} />}</>;
}

/** The sign-up card a tool shows to signed-out visitors when it has no screenshot preview. */
export function SignUpToUse({ name, next }: { name: string; next: string }) {
  const q = `?next=${encodeURIComponent(next)}`;
  return (
    <section aria-labelledby="gate-heading" className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Free account required
      </p>
      <h2 id="gate-heading" className="mt-3 text-xl font-bold text-ink">Use the {name} with a free account</h2>
      <p className="mt-2 text-sm text-muted">Sign up with your email or Google. It&apos;s free, and your work stays with your account.</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link href={`/sign-up${q}`} className={buttonClass("primary", "md")}>Sign up free to use this tool <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        <Link href={`/sign-in${q}`} className={buttonClass("subtle", "md")}>I have an account</Link>
      </div>
    </section>
  );
}
