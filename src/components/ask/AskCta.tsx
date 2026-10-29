import { MessageSquareText } from "lucide-react";
import Link from "next/link";

/** Sidebar card that sends readers to the Ask page, with a link to report an error on this page. */
export function AskCta({ path }: { path: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <MessageSquareText className="h-5 w-5 text-brand-600" aria-hidden="true" />
      <p className="mt-2 font-semibold text-ink">Stuck on a permitting question?</p>
      <p className="mt-1 text-sm text-muted">Send it with the state, the equipment, and what&apos;s changing.</p>
      <Link href="/ask" className="mt-3 inline-flex text-sm font-semibold text-brand-700 hover:underline">Ask a question</Link>
      <Link href={`/ask?topic=correction&page=${encodeURIComponent(path)}`} className="mt-1 block text-xs font-medium text-muted hover:text-brand-700">Report an error on this page</Link>
    </div>
  );
}
