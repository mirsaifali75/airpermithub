"use client";

import { Flag } from "lucide-react";
import { usePathname } from "next/navigation";
import { contactEmail, site } from "@/lib/site";
import { cn } from "@/lib/cn";

/**
 * "Report an error" link for regulatory and tool pages. The email subject
 * names the page so the report can be traced. Renders nothing until
 * `contactEmail` is set, so a report can never bounce.
 */
export function ReportError({ className }: { className?: string }) {
  const path = usePathname() ?? "/";
  if (!contactEmail) return null;
  const subject = `Error report: ${site.domain}${path}`;
  const body = `Page: https://${site.domain}${path}\n\nWhat looks wrong:\n\nOfficial source that shows the correct information (link):\n`;
  const href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <a href={href} className={cn("inline-flex items-center gap-1.5 font-medium text-brand-600 underline-offset-2 hover:underline print:hidden", className)}>
      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
      Report an error on this page
    </a>
  );
}
