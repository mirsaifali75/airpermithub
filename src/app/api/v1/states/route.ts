import { NextResponse } from "next/server";
import { listStateProfiles } from "@/lib/data/state-profiles";

/** GET /api/v1/states — published state hub profiles. */
export function GET() {
  const data = listStateProfiles();
  return NextResponse.json({ data, meta: { count: data.length, version: "v1" } });
}
