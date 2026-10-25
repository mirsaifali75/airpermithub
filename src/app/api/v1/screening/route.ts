import { NextResponse } from "next/server";
import { stateProfileSummaries } from "@/lib/data/state-profiles";
import { screen, type ScreeningInput } from "@/lib/screening";
import { site } from "@/lib/site";

/**
 * POST /api/v1/screening — same preliminary screening the Permit Finder runs.
 * Body: { state, county?, industry, facilityType, equipment: string[] }
 */
export async function POST(req: Request) {
  let body: Partial<ScreeningInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.state || !body.industry || !body.facilityType || !Array.isArray(body.equipment)) {
    return NextResponse.json({ error: "state, industry, facilityType, and equipment[] are required" }, { status: 422 });
  }
  const result = screen(body as ScreeningInput, stateProfileSummaries());
  return NextResponse.json({ data: result, disclaimer: site.screeningDisclaimer });
}
