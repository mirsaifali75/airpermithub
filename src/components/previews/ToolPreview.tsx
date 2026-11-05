import { ArrowRight, CircleCheck, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export interface ToolPreviewProps {
  /** Tool name as shown on its page. */
  name: string;
  /** Screenshot in public/previews, taken from the real tool with its "Load example" data. */
  image: string;
  /** Pixel size of the screenshot, for layout without shift. */
  width: number;
  height: number;
  /** What the signed-in tool does. Facts about the tool only, no claims about features that are not built. */
  points: string[];
  /** Where to send the user after sign-up or sign-in (the tool's own path). */
  next: string;
  /** Optional formula line shown under the points (already on the public page, repeated here for context). */
  formula?: string;
}

/**
 * What a signed-out visitor sees in place of an interactive tool once accounts
 * are switched on: a real screenshot of the tool with example data, what it
 * does, and the sign-up and sign-in buttons. The page around it (method notes,
 * rule text, sources) stays public. Wired in by ToolGate on the accounts branch.
 */
export function ToolPreview({ name, image, width, height, points, next, formula }: ToolPreviewProps) {
  const q = `?next=${encodeURIComponent(next)}`;
  return (
    <section aria-labelledby="preview-heading" className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="relative max-h-[26rem] overflow-hidden border-b border-line bg-canvas">
        <Image src={image} alt={`${name} with example data`} width={width} height={height} sizes="(min-width: 1280px) 860px, 100vw" className="h-auto w-full" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent" />
        <span className="absolute top-3 left-3 rounded-lg bg-navy-900/85 px-2.5 py-1 text-xs font-semibold text-white">Screenshot with example data</span>
      </div>
      <div className="p-5 sm:p-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Free account required
        </p>
        <h2 id="preview-heading" className="mt-3 text-xl font-bold text-ink">Use the {name} with a free account</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {points.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-slate-700">
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-eco-500" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
        {formula && <code className="mt-4 block rounded-lg bg-canvas px-3 py-2 text-xs leading-relaxed break-words whitespace-normal text-navy-800">{formula}</code>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href={`/sign-up${q}`} className={buttonClass("primary", "md")}>
            Sign up free to use this tool <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href={`/sign-in${q}`} className={buttonClass("subtle", "md")}>
            I have an account
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted">The method notes, rule text, and sources below stay open to everyone.</p>
      </div>
    </section>
  );
}
