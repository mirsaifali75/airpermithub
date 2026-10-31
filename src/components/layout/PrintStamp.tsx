"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Shown only on paper and in saved PDFs: where the page came from and when it
 * was printed, so a printout stands on its own in a permit file.
 */
export function PrintStamp() {
  const pathname = usePathname();
  const [printed, setPrinted] = useState("");
  useEffect(() => {
    const stamp = () => setPrinted(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }));
    stamp();
    window.addEventListener("beforeprint", stamp);
    return () => window.removeEventListener("beforeprint", stamp);
  }, []);
  return (
    <div className="hidden border-b border-slate-300 px-1 pb-2 text-[11px] leading-snug text-slate-600 print:block">
      <p><span className="font-bold text-ink">AirPermitHub</span> · airpermithub.com{pathname === "/" ? "" : pathname}{printed && ` · Printed ${printed}`}</p>
      <p>Screening and calculation aid, not a regulatory determination. Confirm against your permit, the rule text, and the agency.</p>
    </div>
  );
}
