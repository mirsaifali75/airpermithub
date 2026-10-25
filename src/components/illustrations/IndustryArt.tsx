import type { IndustryArt as ArtKind } from "@/lib/data/industries";

/**
 * Compact dusk-sky vignettes for industry and tool cards. Each kind gets a
 * recognizable silhouette; all share one palette so the grid reads as a set.
 */

const silhouettes: Record<ArtKind, React.ReactNode> = {
  pumpjack: (
    <g fill="#050c19">
      <path d="M40 120 L70 62 L100 120 Z" opacity="0.95" />
      <rect x="22" y="56" width="120" height="8" rx="3" transform="rotate(-12 82 60)" />
      <path d="M134 40 q16 6 14 30 l-8 -2 q2 -18 -10 -22 z" />
      <rect x="140" y="64" width="3" height="56" />
      <rect x="16" y="104" width="34" height="16" />
      <rect x="0" y="118" width="200" height="12" />
    </g>
  ),
  midstream: (
    <g fill="#050c19">
      <rect x="20" y="86" width="60" height="34" />
      <rect x="86" y="70" width="40" height="50" />
      <rect x="96" y="40" width="6" height="30" />
      <rect x="110" y="48" width="6" height="22" />
      <rect x="130" y="96" width="60" height="6" />
      <rect x="130" y="108" width="60" height="5" />
      <rect x="0" y="118" width="200" height="12" />
    </g>
  ),
  refinery: (
    <g fill="#050c19">
      <rect x="40" y="30" width="14" height="90" rx="6" />
      <rect x="64" y="50" width="12" height="70" rx="5" />
      <rect x="120" y="38" width="5" height="82" />
      <path d="M122.5 38 c-6 -8 -2 -16 0 -22 c3 6 6 14 0 22z" fill="#ffb54d" />
      <rect x="140" y="88" width="50" height="32" />
      <ellipse cx="165" cy="88" rx="25" ry="4" />
      <rect x="54" y="80" width="66" height="4" />
      <rect x="0" y="118" width="200" height="12" />
    </g>
  ),
  chemical: (
    <g fill="#050c19">
      <circle cx="60" cy="80" r="22" />
      <rect x="56" y="80" width="8" height="40" />
      <rect x="96" y="44" width="16" height="76" rx="6" />
      <rect x="124" y="62" width="12" height="58" rx="5" />
      <rect x="148" y="84" width="40" height="36" />
      <rect x="0" y="118" width="200" height="12" />
    </g>
  ),
  power: (
    <g fill="#050c19">
      <path d="M30 120 C 40 90, 36 70, 32 44 H 78 C 74 70, 70 90, 80 120 Z" />
      <path d="M88 120 C 96 96, 93 80, 90 60 H 124 C 121 80, 118 96, 126 120 Z" />
      <rect x="150" y="30" width="8" height="90" />
      <rect x="140" y="90" width="50" height="30" />
      <rect x="0" y="118" width="200" height="12" />
    </g>
  ),
  factory: (
    <g fill="#050c19">
      <path d="M20 120 V80 L50 64 V80 L80 64 V80 L110 64 V120 Z" />
      <rect x="120" y="50" width="10" height="70" />
      <rect x="138" y="62" width="8" height="58" />
      <rect x="152" y="86" width="40" height="34" />
      <rect x="0" y="118" width="200" height="12" />
    </g>
  ),
  aggregate: (
    <g fill="#050c19">
      <path d="M10 120 L60 60 L110 120 Z" opacity="0.9" />
      <rect x="100" y="76" width="90" height="5" transform="rotate(-18 145 78)" />
      <rect x="150" y="62" width="4" height="58" />
      <rect x="120" y="96" width="30" height="24" />
      <rect x="0" y="118" width="200" height="12" />
    </g>
  ),
  landfill: (
    <g fill="#050c19">
      <path d="M0 120 C 40 84, 110 80, 160 104 L200 120 Z" />
      <rect x="150" y="56" width="5" height="50" />
      <path d="M152.5 56 c-5 -7 -2 -13 0 -18 c3 5 5 11 0 18z" fill="#ffb54d" />
      <rect x="0" y="118" width="200" height="12" />
    </g>
  ),
  industrial: (
    <g fill="#050c19">
      <rect x="20" y="70" width="70" height="50" />
      <rect x="40" y="40" width="8" height="30" />
      <rect x="100" y="56" width="16" height="64" rx="6" />
      <rect x="130" y="86" width="60" height="34" />
      <ellipse cx="160" cy="86" rx="30" ry="4" />
      <rect x="0" y="118" width="200" height="12" />
    </g>
  ),
};

export function IndustryArt({ kind, className }: { kind: ArtKind; className?: string }) {
  const id = `ia-${kind}`;
  return (
    <svg viewBox="0 0 200 130" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e1f45" />
          <stop offset="0.5" stopColor="#3e2d5f" />
          <stop offset="0.78" stopColor="#d9683c" />
          <stop offset="1" stopColor="#ffb85c" />
        </linearGradient>
      </defs>
      <rect width="200" height="130" fill={`url(#${id})`} />
      <circle cx="150" cy="112" r="16" fill="#ffd894" opacity="0.8" />
      {silhouettes[kind]}
    </svg>
  );
}
