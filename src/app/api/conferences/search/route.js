import { NextResponse } from "next/server";
import { searchOpenConferences } from "@/lib/conferences/service";

/**
 * Live search open conferences by name or reference.
 * GET /api/conferences/search?q=research
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (String(q).trim().length < 2) {
    return NextResponse.json({ conferences: [] });
  }

  const conferences = await searchOpenConferences(q, { limit: 8 });
  return NextResponse.json({ conferences });
}
