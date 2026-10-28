/**
 * Builds src/lib/data/us-map.json: one SVG path per state (plus DC) in a
 * 975x610 Albers USA layout, from the US Census-derived us-atlas package.
 * Run: node scripts/build-us-map.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve("us-atlas/states-albers-10m.json"), "utf8"));
const path = geoPath(null).digits(0);

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const states = feature(topo, topo.objects.states).features.map((f) => {
  const [cx, cy] = path.centroid(f);
  return { slug: slug(f.properties.name), name: f.properties.name, fips: f.id, d: path(f), cx: Math.round(cx), cy: Math.round(cy) };
}).filter((s) => Number(s.fips) <= 56);

const borders = path(mesh(topo, topo.objects.states, (a, b) => a !== b));
writeFileSync(new URL("../src/lib/data/us-map.json", import.meta.url), JSON.stringify({ width: 975, height: 610, states, borders }));
console.log(`${states.length} shapes`);
