import { cn } from "@/lib/cn";
import { companyFor } from "@/lib/data/jobs";

/** Monogram tile for fictional demo employers. Real logos appear only with the employer's permission. */
export function CompanyLogo({ company, size = "md" }: { company: string; size?: "sm" | "md" | "lg" }) {
  const c = companyFor(company);
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl font-display font-extrabold text-white", c?.color ?? "bg-navy-800", size === "lg" ? "h-20 w-20 text-2xl" : size === "sm" ? "h-10 w-10 text-xs sm:h-12 sm:w-12 sm:text-sm" : "h-12 w-12 text-sm")} aria-hidden="true">
      {c?.initials ?? company.slice(0, 2).toUpperCase()}
    </span>
  );
}
