import { NextResponse } from "next/server";
import { clientKey, createRateLimiter } from "@/lib/api/rate-limit";
import { validateScreening } from "@/lib/api/validate-screening";
import { stateProfileSummaries } from "@/lib/data/state-profiles";
import { screen } from "@/lib/screening";
import { site } from "@/lib/site";

/**
 * POST /api/v1/screening — same preliminary screening the Permit Finder runs.
 * Body: { state, county?, industry, facilityType, equipment: string[], controls?, pollutants?, project?,
 *         existingAuthorization?, pteKnown?, schedule?, datesKnown?, attainment?, hapStatus? }
 */

const MAX_BODY_BYTES = 8 * 1024;
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

export async function POST(req: Request) {
  const rate = limiter.check(clientKey(req));
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const summaries = stateProfileSummaries();
  const parsed = validateScreening(body, new Set(summaries.map((s) => s.slug)));
  if (!parsed.ok) return NextResponse.json({ error: "Invalid request", details: parsed.errors }, { status: 422 });

  const result = screen(parsed.value, summaries);
  return NextResponse.json(
    { data: result, disclaimer: site.screeningDisclaimer },
    { headers: { "X-RateLimit-Remaining": String(rate.remaining) } },
  );
}
