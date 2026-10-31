import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Scene } from "@/components/illustrations/Scene";

const points = ["Permit screening for all 50 states + DC", "Transparent, cited emission calculations", "Compliance deadlines in one calendar"];

/** Split sign-in layout: industrial scene on the left, form on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] pt-32 lg:grid-cols-2 lg:pt-40">
      <div className="relative hidden overflow-hidden bg-navy-950 lg:block">
        <Scene kind="refinery" className="absolute inset-0 h-full w-full" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/30 to-navy-950/20" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="text-xs font-bold tracking-[0.28em] text-cyan-400">FROM REGULATIONS TO OPERATIONS</p>
          <p className="mt-3 max-w-md font-display text-3xl leading-tight font-extrabold">Air permitting and compliance, in one place.</p>
          <ul className="mt-6 space-y-2">
            {points.map((p) => <li key={p} className="flex items-center gap-2 text-sm text-white/85"><CircleCheck className="h-4.5 w-4.5 text-eco-500" aria-hidden="true" />{p}</li>)}
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center bg-white px-4 py-12 sm:px-8">{children}</div>
    </div>
  );
}
