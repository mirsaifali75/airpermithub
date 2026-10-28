import { useId, type ReactNode } from "react";

/**
 * Photo-style industrial scenes at dusk, drawn as vector art.
 *
 * Each kind composes reusable plant elements (columns, stacks, flares, tanks,
 * pump jacks, cooling towers...) over a layered sky with haze, glowing work
 * lights, water reflections, film grain, and a vignette. Vector keeps the
 * pages light and avoids licensing stock photography; a licensed photo can
 * replace any instance later.
 */

export type SceneKind =
  | "refinery"
  | "oil-gas"
  | "midstream"
  | "power"
  | "chemical"
  | "manufacturing"
  | "mining"
  | "waste"
  | "tank-farm"
  | "industrial";

export type SceneTone = "dusk" | "blue" | "night";

const W = 480;
const H = 300;
const G = 236; // horizon / ground line

type Light = [x: number, y: number, size?: number];

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Collects silhouette shapes and the work lights that belong to them. */
class Plant {
  shapes: ReactNode[] = [];
  lights: Light[] = [];
  flames: ReactNode[] = [];
  steam: ReactNode[] = [];
  beacons: Light[] = [];
  private k = 0;
  constructor(private glow: string, private soft: string) {}
  private key() {
    return `s${this.k++}`;
  }

  column(x: number, w: number, h: number) {
    const top = G - h;
    this.shapes.push(<rect key={this.key()} x={x - w / 2} y={top} width={w} height={h} rx={w / 2.6} />);
    this.shapes.push(<rect key={this.key()} x={x - 1} y={top - 10} width={2} height={12} />);
    for (let y = top + 16; y < G - 10; y += 22) {
      this.shapes.push(<rect key={this.key()} x={x - w / 2 - 4} y={y} width={w + 8} height={1.6} />);
      this.shapes.push(<rect key={this.key()} x={x - w / 2 - 4} y={y - 4} width={0.8} height={4} />);
      this.shapes.push(<rect key={this.key()} x={x + w / 2 + 3.2} y={y - 4} width={0.8} height={4} />);
      this.lights.push([x - w / 2 - 3, y - 1.5], [x + w / 2 + 3, y - 1.5]);
    }
    this.beacons.push([x, top - 11]);
    return this;
  }

  stack(x: number, w: number, h: number) {
    const top = G - h;
    this.shapes.push(
      <path key={this.key()} d={`M${x - w / 2} ${G}L${x - w * 0.32} ${top}H${x + w * 0.32}L${x + w / 2} ${G}Z`} />,
      <rect key={this.key()} x={x - w * 0.38} y={top + 8} width={w * 0.76} height={2} />,
    );
    this.beacons.push([x, top - 2]);
    return this;
  }

  flare(x: number, h: number, size = 1) {
    const top = G - h;
    this.shapes.push(
      <rect key={this.key()} x={x - 1.4} y={top} width={2.8} height={h} />,
      <path key={this.key()} d={`M${x} ${top + 12}L${x - h * 0.32} ${G}M${x} ${top + 12}L${x + h * 0.32} ${G}M${x} ${top + h * 0.45}L${x - h * 0.22} ${G}M${x} ${top + h * 0.45}L${x + h * 0.22} ${G}`} stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.7" />,
    );
    this.flames.push(
      <g key={this.key()} className="aph-flame">
        <ellipse cx={x} cy={top - 8 * size} rx={10 * size} ry={14 * size} fill="#ff9a3c" opacity="0.35" filter={this.glow} />
        <path d={`M${x} ${top}c-${6 * size} -${6 * size} -${4 * size} -${16 * size} ${size} -${24 * size}c${1 * size} ${7 * size} ${8 * size} ${11 * size} ${3 * size} ${24 * size}z`} fill="#ffb347" />
        <path d={`M${x} ${top}c-${2.5 * size} -${3 * size} -${2 * size} -${8 * size} ${0.6 * size} -${13 * size}c${0.5 * size} ${4 * size} ${4 * size} ${7 * size} ${1.2 * size} ${13 * size}z`} fill="#fff1c1" />
      </g>,
    );
    return this;
  }

  sphere(x: number, r: number) {
    const cy = G - r - 9;
    this.shapes.push(<circle key={this.key()} cx={x} cy={cy} r={r} />);
    for (const dx of [-0.75, -0.25, 0.25, 0.75]) this.shapes.push(<rect key={this.key()} x={x + dx * r - 1} y={cy} width={2} height={G - cy} />);
    this.shapes.push(<rect key={this.key()} x={x - r - 2} y={cy - 1} width={2 * r + 4} height={1.4} />);
    this.lights.push([x - r - 1, cy - 2], [x + r + 1, cy - 2]);
    return this;
  }

  tank(x: number, w: number, h: number) {
    const top = G - h;
    this.shapes.push(
      <rect key={this.key()} x={x - w / 2} y={top} width={w} height={h} />,
      <ellipse key={this.key()} cx={x} cy={top} rx={w / 2} ry={w / 14} />,
      <path key={this.key()} d={`M${x - w / 2} ${G}L${x + w / 2 - 2} ${top + 2}`} stroke="currentColor" strokeWidth="0.8" opacity="0.5" fill="none" />,
    );
    this.lights.push([x + w / 2 - 2, top + 1]);
    return this;
  }

  vessel(x: number, w: number, h: number, y = G - 6) {
    this.shapes.push(<rect key={this.key()} x={x - w / 2} y={y - h} width={w} height={h} rx={h / 2} />);
    this.shapes.push(<rect key={this.key()} x={x - w / 3} y={y} width={2} height={G - y} />, <rect key={this.key()} x={x + w / 3 - 2} y={y} width={2} height={G - y} />);
    return this;
  }

  derrick(x: number, h: number, w: number) {
    const top = G - h;
    const lines: ReactNode[] = [];
    const rungs = Math.floor(h / 16);
    for (let r = 1; r < rungs; r++) {
      const y = G - (h * r) / rungs;
      const s = (w / 2) * (1 - r / rungs) + 2;
      const yn = G - (h * (r + 1)) / rungs;
      const sn = (w / 2) * (1 - (r + 1) / rungs) + 2;
      lines.push(<path key={`r${r}`} d={`M${x - s} ${y}H${x + s}M${x - s} ${y}L${x + sn} ${yn}`} />);
      if (r % 3 === 0) this.lights.push([x - s, y - 1]);
    }
    this.shapes.push(
      <g key={this.key()} stroke="currentColor" strokeWidth="1.3" fill="none">
        <path d={`M${x - w / 2} ${G}L${x - 2} ${top}M${x + w / 2} ${G}L${x + 2} ${top}`} />
        {lines}
      </g>,
      <rect key={this.key()} x={x - 5} y={top - 8} width={10} height={9} />,
      <rect key={this.key()} x={x - w / 2 - 14} y={G - 16} width={w + 28} height={16} />,
    );
    this.beacons.push([x, top - 10]);
    return this;
  }

  pumpjack(x: number, s = 1) {
    const q = (n: number) => n * s;
    this.shapes.push(
      <g key={this.key()}>
        <path d={`M${x - q(13)} ${G}L${x - q(1.5)} ${G - q(35)}H${x + q(1.5)}L${x + q(11)} ${G}H${x + q(7)}L${x} ${G - q(28)}L${x - q(9)} ${G}Z`} />
        <path d={`M${x - q(38)} ${G - q(38)}L${x + q(31)} ${G - q(33)}L${x + q(31)} ${G - q(29)}L${x - q(38)} ${G - q(34)}Z`} />
        <path d={`M${x - q(36)} ${G - q(41)}C${x - q(46)} ${G - q(41)} ${x - q(52)} ${G - q(34)} ${x - q(50)} ${G - q(20)}L${x - q(44)} ${G - q(21)}C${x - q(45)} ${G - q(29)} ${x - q(42)} ${G - q(33)} ${x - q(36)} ${G - q(33)}Z`} />
        <rect x={x - q(47.6)} y={G - q(21)} width={q(1)} height={q(15)} />
        <rect x={x - q(51)} y={G - q(7)} width={q(7)} height={q(7)} />
        <rect x={x + q(26.5)} y={G - q(31)} width={q(1.6)} height={q(19)} />
        <circle cx={x + q(27)} cy={G - q(12)} r={q(8.5)} />
        <rect x={x + q(18)} y={G - q(9)} width={q(18)} height={q(9)} />
        <rect x={x - q(54)} y={G - q(2.5)} width={q(94)} height={q(2.5)} />
      </g>,
    );
    this.lights.push([x - q(47), G - q(9)]);
    return this;
  }

  coolingTower(x: number, w: number, h: number) {
    const top = G - h;
    const half = w / 2;
    this.shapes.push(
      <path
        key={this.key()}
        d={`M${x - half} ${G}C${x - half * 0.62} ${G - h * 0.45} ${x - half * 0.55} ${top + h * 0.25} ${x - half * 0.68} ${top}H${x + half * 0.68}C${x + half * 0.55} ${top + h * 0.25} ${x + half * 0.62} ${G - h * 0.45} ${x + half} ${G}Z`}
      />,
    );
    this.steam.push(
      <g key={this.key()} fill="#e9e4f2" filter={this.soft}>
        <ellipse cx={x + 6} cy={top - 18} rx={half * 0.75} ry={18} opacity="0.32" />
        <ellipse cx={x + 22} cy={top - 44} rx={half * 0.9} ry={20} opacity="0.22" />
        <ellipse cx={x + 44} cy={top - 70} rx={half} ry={18} opacity="0.12" />
      </g>,
    );
    return this;
  }

  rack(x1: number, x2: number, y: number, levels = 2) {
    for (let l = 0; l < levels; l++) this.shapes.push(<rect key={this.key()} x={x1} y={y + l * 7} width={x2 - x1} height={1.6} />);
    for (let x = x1; x <= x2; x += 16) {
      this.shapes.push(<rect key={this.key()} x={x} y={y} width={1.4} height={G - y} />);
      if ((x - x1) % 48 === 0) this.lights.push([x + 0.7, y - 1.5]);
    }
    return this;
  }

  building(x: number, w: number, h: number, roof: "flat" | "saw" = "flat", windows = true) {
    const top = G - h;
    if (roof === "saw") {
      const teeth = Math.max(2, Math.round(w / 22));
      const tw = w / teeth;
      let d = `M${x} ${G}V${top + 8}`;
      for (let t = 0; t < teeth; t++) d += `L${x + t * tw + tw * 0.85} ${top}V${top + 8}L${x + (t + 1) * tw} ${top + 8}`;
      d += `V${G}Z`;
      this.shapes.push(<path key={this.key()} d={d} />);
    } else {
      this.shapes.push(<rect key={this.key()} x={x} y={top} width={w} height={h} />);
    }
    if (windows) {
      for (let wy = top + 14; wy < G - 8; wy += 9)
        for (let wx = x + 5; wx < x + w - 6; wx += 8) this.lights.push([wx, wy, 0.6]);
    }
    return this;
  }

  conveyor(x1: number, y1: number, x2: number, y2: number) {
    this.shapes.push(<path key={this.key()} d={`M${x1} ${y1}L${x2} ${y2}`} stroke="currentColor" strokeWidth="3.2" fill="none" />);
    const n = Math.max(2, Math.round(Math.abs(x2 - x1) / 30));
    for (let i = 1; i < n; i++) {
      const px = x1 + ((x2 - x1) * i) / n;
      const py = y1 + ((y2 - y1) * i) / n;
      this.shapes.push(<rect key={this.key()} x={px - 0.8} y={py} width={1.6} height={G - py} />);
    }
    this.lights.push([x2, y2 - 2]);
    return this;
  }

  pile(x: number, w: number, h: number, fill = "#151425") {
    this.shapes.push(<path key={this.key()} d={`M${x - w / 2} ${G}C${x - w / 4} ${G - h * 0.9} ${x - w / 10} ${G - h} ${x} ${G - h}S${x + w / 4} ${G - h * 0.9} ${x + w / 2} ${G}Z`} fill={fill} />);
    return this;
  }

  pylon(x: number, h: number) {
    const top = G - h;
    this.shapes.push(
      <g key={this.key()} stroke="currentColor" strokeWidth="1" fill="none">
        <path d={`M${x - 9} ${G}L${x - 2} ${top}H${x + 2}L${x + 9} ${G}M${x - 7} ${G - h * 0.3}L${x + 7} ${G - h * 0.6}M${x + 7} ${G - h * 0.3}L${x - 7} ${G - h * 0.6}`} />
        <path d={`M${x - 14} ${top + 8}H${x + 14}M${x - 11} ${top + 18}H${x + 11}`} strokeWidth="1.6" />
      </g>,
    );
    return this;
  }

  wires(points: [number, number][]) {
    let d = "";
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[i + 1];
      d += `M${ax} ${ay}Q${(ax + bx) / 2} ${Math.max(ay, by) + 14} ${bx} ${by}`;
    }
    this.shapes.push(<path key={this.key()} d={d} stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.8" />);
    return this;
  }

  mound(x1: number, x2: number, h: number) {
    const mid = (x1 + x2) / 2;
    this.shapes.push(<path key={this.key()} d={`M${x1} ${G}C${x1 + 40} ${G - h} ${mid - 40} ${G - h} ${mid} ${G - h}S${x2 - 40} ${G - h * 0.8} ${x2} ${G}Z`} />);
    for (let x = x1 + 50; x < x2 - 40; x += 34) this.shapes.push(<rect key={this.key()} x={x} y={G - h - 6} width={1.6} height={10} />);
    return this;
  }

  pipeline(y: number) {
    this.shapes.push(<rect key={this.key()} x={0} y={y} width={W} height={5} rx={2.5} />);
    for (let x = 12; x < W; x += 34) this.shapes.push(<rect key={this.key()} x={x} y={y + 5} width={3} height={G - y + 20} />);
    return this;
  }

  scatter(seed: string, n: number, minX: number, maxX: number) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) this.lights.push([minX + r() * (maxX - minX), G - 2 - r() * 12, 0.7 + r() * 0.6]);
    return this;
  }
}

function compose(kind: SceneKind, glow: string, soft: string): { plant: Plant; sunX: number; water: boolean; mountains: boolean } {
  const p = new Plant(glow, soft);
  switch (kind) {
    case "refinery":
      p.rack(20, 330, G - 44, 3)
        .column(64, 15, 124).column(90, 10, 92).column(150, 19, 150).column(178, 9, 78)
        .stack(222, 11, 168).flare(262, 176)
        .column(300, 8, 84).sphere(338, 17).sphere(376, 15)
        .tank(420, 46, 30).tank(462, 38, 24)
        .building(100, 40, 26, "flat").scatter(kind, 26, 0, W);
      return { plant: p, sunX: 300, water: true, mountains: false };
    case "oil-gas":
      p.derrick(118, 150, 46).flare(42, 96, 0.8)
        .pumpjack(262, 1.15).pumpjack(372, 0.82)
        .tank(430, 22, 34).tank(456, 22, 34).vessel(190, 34, 9).vessel(196, 24, 7, G - 20)
        .scatter(kind, 12, 0, W);
      return { plant: p, sunX: 330, water: false, mountains: false };
    case "midstream":
      p.building(30, 140, 42, "flat").stack(64, 6, 66).stack(96, 6, 66).stack(128, 6, 66)
        .rack(176, 330, G - 32, 2).vessel(212, 40, 10, G - 40).column(258, 10, 70)
        .flare(352, 140, 0.85).tank(406, 40, 32).tank(452, 36, 28)
        .pipeline(G + 18).scatter(kind, 14, 0, W);
      return { plant: p, sunX: 250, water: false, mountains: false };
    case "power":
      p.coolingTower(84, 92, 116).coolingTower(190, 80, 98).stack(276, 13, 178)
        .building(300, 112, 54, "flat").building(312, 46, 72, "flat", false)
        .pylon(438, 104).pylon(22, 84).wires([[24, G - 76], [438, G - 96], [500, G - 90]])
        .scatter(kind, 14, 0, W);
      return { plant: p, sunX: 360, water: true, mountains: false };
    case "chemical":
      p.rack(10, 300, G - 40, 3).sphere(46, 20).sphere(92, 20).column(140, 13, 120).column(162, 9, 96)
        .stack(198, 9, 150).column(234, 16, 104).tank(282, 30, 46).tank(318, 30, 46)
        .building(346, 90, 46, "flat").flare(452, 150, 0.8).scatter(kind, 20, 0, W);
      return { plant: p, sunX: 200, water: true, mountains: false };
    case "manufacturing":
      p.building(14, 230, 54, "saw").stack(262, 10, 128).stack(286, 8, 104)
        .building(304, 150, 76, "flat").tank(268, 24, 40).rack(240, 304, G - 26, 1)
        .scatter(kind, 10, 0, W);
      return { plant: p, sunX: 140, water: false, mountains: false };
    case "mining":
      p.pile(340, 210, 74, "#171628").pile(430, 120, 44, "#121224")
        .conveyor(126, G - 6, 290, G - 92).conveyor(250, G - 12, 380, G - 60)
        .building(70, 60, 50, "flat").building(150, 42, 34, "flat", false).column(196, 12, 68)
        .scatter(kind, 10, 0, W);
      return { plant: p, sunX: 120, water: false, mountains: true };
    case "waste":
      p.mound(-20, 330, 66).flare(392, 112, 0.75).building(420, 56, 30, "flat")
        .vessel(360, 26, 8).scatter(kind, 8, 0, W);
      return { plant: p, sunX: 160, water: false, mountains: false };
    case "tank-farm":
      p.tank(52, 74, 46).tank(140, 74, 46).tank(226, 66, 40).tank(300, 56, 34).tank(370, 66, 40)
        .rack(10, 470, G - 12, 1).flare(452, 120, 0.7).scatter(kind, 14, 0, W);
      return { plant: p, sunX: 240, water: true, mountains: false };
    default:
      p.building(20, 90, 50, "flat").stack(132, 10, 128).column(170, 14, 96).tank(222, 40, 36)
        .building(260, 110, 40, "saw").sphere(410, 18).rack(240, 470, G - 30, 2).scatter(kind, 14, 0, W);
      return { plant: p, sunX: 300, water: false, mountains: false };
  }
}

const palettes: Record<SceneTone, { sky: [number, string][]; sun: string; far: string; ground: string }> = {
  dusk: {
    sky: [[0, "#081329"], [0.32, "#1c2550"], [0.55, "#4b3263"], [0.72, "#a24f4a"], [0.86, "#e8823f"], [1, "#ffc06a"]],
    sun: "#ffcf86",
    far: "#3a3150",
    ground: "#0b0d1a",
  },
  blue: {
    sky: [[0, "#061127"], [0.4, "#0f2a55"], [0.7, "#1f4f8c"], [0.88, "#5d86b8"], [1, "#f2a766"]],
    sun: "#ffc98a",
    far: "#243a5e",
    ground: "#070c18",
  },
  night: {
    sky: [[0, "#040914"], [0.5, "#0b1e3a"], [0.85, "#16386a"], [1, "#2f5f9e"]],
    sun: "#6fb6ff",
    far: "#162a4a",
    ground: "#04070f",
  },
};

export function Scene({
  kind,
  tone = "dusk",
  className,
  grain = true,
}: {
  kind: SceneKind;
  tone?: SceneTone;
  className?: string;
  grain?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (n: string) => `${n}${uid}`;
  const filterRef = (n: "__glow" | "__soft") => `url(#${id(n)})`;
  const { plant, sunX, water, mountains } = compose(kind, filterRef("__glow"), filterRef("__soft"));
  const pal = palettes[tone];
  const r = rng(`${kind}-far`);

  // Distant skyline in the haze
  const far: ReactNode[] = [];
  for (let x = -10; x < W; ) {
    const w = 6 + r() * 22;
    const h = 8 + r() * 30;
    far.push(<rect key={x} x={x} y={G - h} width={w} height={h} />);
    if (r() > 0.7) far.push(<rect key={`${x}t`} x={x + w / 2 - 1} y={G - h - 14 - r() * 20} width={2} height={20} />);
    x += w + r() * 18;
  }


  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2={G / H}>
          {pal.sky.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
        <radialGradient id={id("sun")} cx={sunX / W} cy={G / H} r="0.55" fx={sunX / W} fy={G / H}>
          <stop offset="0" stopColor={pal.sun} stopOpacity="0.95" />
          <stop offset="0.25" stopColor={pal.sun} stopOpacity="0.35" />
          <stop offset="1" stopColor={pal.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("ground")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.ground} />
          <stop offset="1" stopColor="#020308" />
        </linearGradient>
        <linearGradient id={id("water")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.sky[pal.sky.length - 1][1]} stopOpacity="0.55" />
          <stop offset="0.5" stopColor={pal.sky[pal.sky.length - 3][1]} stopOpacity="0.25" />
          <stop offset="1" stopColor="#020308" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("rim")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.sun} stopOpacity="0.16" />
          <stop offset="1" stopColor={pal.sun} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id("vig")} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <filter id={id("__glow")} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={id("__soft")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {grain && (
          <filter id={id("grain")}>
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0" />
          </filter>
        )}
      </defs>

      <rect width={W} height={G + 1} fill={`url(#${id("sky")})`} />
      <rect width={W} height={H} fill={`url(#${id("sun")})`} />
      {/* cloud streaks */}
      <g filter={filterRef("__soft")}>
        <ellipse cx={W * 0.25} cy={G * 0.42} rx="150" ry="7" fill="#2a2148" opacity="0.5" />
        <ellipse cx={W * 0.7} cy={G * 0.3} rx="170" ry="6" fill="#ffb27a" opacity="0.18" />
        <ellipse cx={W * 0.55} cy={G * 0.6} rx="190" ry="5" fill="#ffd2a0" opacity="0.2" />
        <ellipse cx={W * 0.1} cy={G * 0.18} rx="120" ry="5" fill="#1b1d3d" opacity="0.6" />
      </g>
      <circle cx={sunX} cy={G - 2} r="9" fill={pal.sun} opacity="0.9" filter={filterRef("__glow")} />

      {mountains && (
        <path d={`M0 ${G - 40}L60 ${G - 70}L120 ${G - 52}L190 ${G - 96}L260 ${G - 60}L330 ${G - 84}L400 ${G - 50}L480 ${G - 72}V${G}H0Z`} fill={pal.far} opacity="0.75" />
      )}
      <g fill={pal.far} opacity={kind === "oil-gas" || kind === "waste" || kind === "mining" ? 0.3 : 0.5}>{far}</g>
      {plant.steam}

      <rect y={G} width={W} height={H - G} fill={`url(#${id("ground")})`} />
      <rect y={G} width={W} height="22" fill={`url(#${id("rim")})`} />
      {water && (
        <g>
          <rect y={G + 10} width={W} height={H - G - 10} fill={`url(#${id("water")})`} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={sunX - 70 + i * 9} y={G + 14 + i * 7} width={140 - i * 18} height="1.2" fill={pal.sun} opacity={0.45 - i * 0.06} />
          ))}
          {plant.lights.filter((_, i) => i % 3 === 0).map(([x], i) => (
            <rect key={i} x={x - 0.6} y={G + 12} width="1.2" height="16" fill="#ffd27a" opacity="0.25" />
          ))}
        </g>
      )}

      <g fill="#070a16" color="#070a16">{plant.shapes}</g>

      <g fill="#ffd27a">
        <g filter={filterRef("__glow")} opacity="0.75">
          {plant.lights.map(([x, y, s = 1], i) => <circle key={i} cx={x} cy={y} r={2.4 * s} />)}
        </g>
        {plant.lights.map(([x, y, s = 1], i) => <circle key={i} cx={x} cy={y} r={0.75 * s} fill="#fff4d6" />)}
      </g>
      <g fill="#ff4d3d">
        {plant.beacons.map(([x, y], i) => (
          <g key={i} className="aph-blink" style={{ animationDelay: `${i * 0.7}s` }}>
            <circle cx={x} cy={y} r="3" opacity="0.45" filter={filterRef("__glow")} />
            <circle cx={x} cy={y} r="1" />
          </g>
        ))}
      </g>
      {plant.flames}

      <rect width={W} height={H} fill={`url(#${id("vig")})`} />
      {grain && <rect width={W} height={H} filter={`url(#${id("grain")})`} opacity="0.9" />}
    </svg>
  );
}
