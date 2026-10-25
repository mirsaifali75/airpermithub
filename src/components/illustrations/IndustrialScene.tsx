/**
 * Hero background: an industrial skyline at dusk, drawn as vector art so it
 * stays sharp, weighs a few KB, and never needs stock photography. A real
 * photo can replace it later by swapping this component for next/image.
 */

type Derrick = { x: number; h: number; w: number };

const derricks: Derrick[] = [
  { x: 905, h: 400, w: 70 },
  { x: 1075, h: 330, w: 60 },
  { x: 1335, h: 310, w: 58 },
  { x: 1500, h: 255, w: 50 },
];

const BASE = 772;

function DerrickShape({ x, h, w }: Derrick) {
  const top = BASE - h;
  const half = w / 2;
  const rungs = Math.floor(h / 34);
  const lines = [];
  for (let r = 1; r < rungs; r++) {
    const y = BASE - (h * r) / rungs;
    const spread = half * (1 - r / rungs) + 4;
    lines.push(<line key={`r${r}`} x1={x - spread} y1={y} x2={x + spread} y2={y} />);
    const yNext = BASE - (h * (r + 1)) / rungs;
    const spreadNext = half * (1 - (r + 1) / rungs) + 4;
    lines.push(<line key={`d${r}`} x1={x - spread} y1={y} x2={x + spreadNext} y2={yNext} />);
  }
  return (
    <g>
      <g stroke="#060d1b" strokeWidth="3" fill="none">
        <line x1={x - half} y1={BASE} x2={x - 4} y2={top} />
        <line x1={x + half} y1={BASE} x2={x + 4} y2={top} />
        {lines}
      </g>
      <rect x={x - 9} y={top - 16} width="18" height="18" fill="#060d1b" />
      <circle cx={x} cy={top - 20} r="2.6" className="aph-blink" fill="#ff5a4e" />
    </g>
  );
}

const lights: [number, number][] = [
  [905, 560], [905, 650], [1075, 600], [1335, 640], [1500, 690], [994, 520], [994, 600], [994, 690],
  [1252, 560], [1252, 650], [820, 720], [1420, 720], [1190, 700], [1110, 730], [960, 740], [1560, 735],
  [700, 745], [760, 735], [1290, 735],
];

export function IndustrialScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050f22" />
          <stop offset="0.28" stopColor="#13234d" />
          <stop offset="0.48" stopColor="#3c2c5c" />
          <stop offset="0.62" stopColor="#a4485a" />
          <stop offset="0.74" stopColor="#ec7a3a" />
          <stop offset="0.84" stopColor="#ffbf5e" />
        </linearGradient>
        <radialGradient id="sun" cx="1185" cy="735" r="520" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe3a1" stopOpacity="0.95" />
          <stop offset="0.12" stopColor="#ffb860" stopOpacity="0.7" />
          <stop offset="0.45" stopColor="#ff7a3d" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ff7a3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="readability" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#061227" stopOpacity="0.97" />
          <stop offset="0.34" stopColor="#061227" stopOpacity="0.88" />
          <stop offset="0.56" stopColor="#061227" stopOpacity="0.2" />
          <stop offset="1" stopColor="#061227" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#061227" stopOpacity="0" />
          <stop offset="0.75" stopColor="#061227" stopOpacity="0.6" />
          <stop offset="1" stopColor="#061227" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffdd7a" />
          <stop offset="0.6" stopColor="#ff8a2b" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="airstream" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1E6FFF" stopOpacity="0" />
          <stop offset="0.4" stopColor="#00B4FF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#22C55E" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#sky)" />
      <rect width="1600" height="900" fill="url(#sun)" />
      <circle cx="1185" cy="742" r="46" fill="#ffe7b0" />

      {/* Distant ridgeline */}
      <path d="M560 760 L700 690 L790 720 L900 660 L1010 705 L1120 668 L1240 712 L1360 650 L1470 700 L1600 662 V780 H560 Z" fill="#2b2547" opacity="0.85" />
      <path d="M600 770 L760 730 L880 748 L1000 722 L1150 752 L1300 728 L1450 750 L1600 730 V790 H600 Z" fill="#1a1a35" />

      {/* Process plant silhouette */}
      <g fill="#060d1b">
        {/* Distillation columns */}
        <rect x="980" y="470" width="28" height="302" rx="12" />
        <rect x="1240" y="510" width="24" height="262" rx="10" />
        <rect x="1190" y="600" width="18" height="172" rx="8" />
        {/* Stack with flare */}
        <rect x="1418" y="440" width="9" height="332" />
        {/* Storage tanks */}
        <rect x="690" y="712" width="150" height="62" />
        <ellipse cx="765" cy="712" rx="75" ry="9" />
        <rect x="860" y="728" width="96" height="46" />
        <ellipse cx="908" cy="728" rx="48" ry="7" />
        <rect x="1370" y="715" width="130" height="59" />
        <ellipse cx="1435" cy="715" rx="65" ry="8" />
        {/* Pipe racks */}
        <rect x="1008" y="690" width="232" height="6" />
        <rect x="1008" y="712" width="232" height="5" />
        <rect x="1100" y="640" width="70" height="132" />
        <rect x="1520" y="700" width="80" height="74" />
        <rect x="560" y="772" width="1040" height="128" />
      </g>
      {derricks.map((d) => (
        <DerrickShape key={d.x} {...d} />
      ))}
      <path className="aph-flicker" d="M1422.5 440 C 1410 420, 1418 402, 1422.5 386 C 1428 402, 1436 420, 1422.5 440 Z" fill="url(#flame)" />

      {lights.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="#ffd27a" opacity="0.9" />
      ))}

      {/* Air stream motif */}
      <path d="M380 560 C 700 470, 1000 610, 1600 470" stroke="url(#airstream)" strokeWidth="2" fill="none" />
      <path d="M520 610 C 820 540, 1080 650, 1600 540" stroke="url(#airstream)" strokeWidth="1.2" fill="none" opacity="0.7" />

      <rect width="1600" height="900" fill="url(#readability)" />
      <rect y="700" width="1600" height="200" fill="url(#floor)" />
    </svg>
  );
}
