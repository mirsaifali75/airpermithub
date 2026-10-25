import { NextResponse } from "next/server";
import { federalRegulations } from "@/lib/data/regulations";

/** GET /api/v1/regulations — federal program records with provenance. */
export function GET() {
  return NextResponse.json({ data: federalRegulations, meta: { count: federalRegulations.length, version: "v1" } });
}
