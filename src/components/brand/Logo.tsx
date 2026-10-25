import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * AirPermitHub "A" mark: an A-frame (industrial structure) cut by a blue-cyan
 * air stream, with a facility silhouette in the counter and a green leaf at
 * the apex. Built from flat shapes so it holds up at favicon sizes.
 */
export function LogoMark({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const id = useId().replace(/:/g, "");
  const frame = tone === "dark" ? "#FFFFFF" : "#0B1E3A";
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-air`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1E6FFF" />
          <stop offset="1" stopColor="#00B4FF" />
        </linearGradient>
        <linearGradient id={`${id}-leg`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#1E6FFF" />
          <stop offset="1" stopColor="#00B4FF" />
        </linearGradient>
      </defs>
      {/* Left leg */}
      <path d="M4 45 L20.5 6 H27 L11.5 45 Z" fill={frame} />
      {/* Right leg */}
      <path d="M27 6 L44 45 H36.5 L24 15.5 Z" fill={`url(#${id}-leg)`} />
      {/* Facility silhouette inside the counter */}
      <path d="M17 45 V38 H19.5 V33 H21 V38 H23 V35 L26 33.5 V38 H28 V31 H29.5 V38 H31 V45 Z" fill={frame} opacity="0.9" />
      {/* Air stream crossbar */}
      <path d="M2 31.5 C 12 24, 24 30.5, 41 21" stroke={`url(#${id}-air)`} strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d="M8 36 C 16 31.5, 25 34.5, 36 29" stroke="#00B4FF" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* Leaf */}
      <path d="M31 9 C 31.5 3.5, 37 1, 46 1.5 C 45.5 8.5, 40 12.5, 31 9 Z" fill="#22C55E" />
      <path d="M32 8.6 C 36 6.5, 39.5 5, 43 3.2" stroke="#0B1E3A" strokeOpacity="0.35" strokeWidth="0.8" fill="none" />
    </svg>
  );
}

export function Logo({
  tone = "dark",
  showTagline = false,
  className,
}: {
  /** "dark" = for dark backgrounds (white wordmark). */
  tone?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} className="h-9 w-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.35rem] font-extrabold tracking-tight">
          <span className={tone === "dark" ? "text-white" : "text-navy-900"}>AirPermit</span>
          <span className="text-brand-500">Hub</span>
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 text-[0.55rem] font-semibold tracking-[0.18em]",
              tone === "dark" ? "text-white/70" : "text-muted",
            )}
          >
            AIR PERMITTING. COMPLIANCE. SIMPLIFIED.
          </span>
        )}
      </span>
    </span>
  );
}
