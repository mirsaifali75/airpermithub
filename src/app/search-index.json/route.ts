import { ruleSummaries } from "@/lib/data/ecfr";
import { listStateProfiles } from "@/lib/data/state-profiles";
import { buildSearchIndex } from "@/lib/search";

/** The site search index, built at deploy time and loaded when search first opens. */
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildSearchIndex(listStateProfiles(), ruleSummaries()));
}
