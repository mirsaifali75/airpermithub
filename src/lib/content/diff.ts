import { isDeepStrictEqual } from "node:util";
import type { Content } from "./types";

/** Records that differ between two content sets, as "kind/slug", plus any change of order. */
export function contentDiff(a: Content, b: Content) {
  const out: string[] = [];
  for (const kind of ["states", "regulations", "glossary"] as const) {
    const left = new Map(a[kind].map((x) => [x.slug, JSON.parse(JSON.stringify(x))]));
    const right = new Map(b[kind].map((x) => [x.slug, JSON.parse(JSON.stringify(x))]));
    for (const slug of new Set([...left.keys(), ...right.keys()])) {
      if (!isDeepStrictEqual(left.get(slug), right.get(slug))) out.push(`${kind}/${slug}`);
    }
    if (a[kind].map((x) => x.slug).join() !== b[kind].map((x) => x.slug).join() && !out.length) out.push(`${kind}: order differs`);
  }
  return out;
}
