import { NextResponse } from "next/server";
import { searchOpenConferences } from "@/lib/conferences/service";
import { getPublishedConferencesCached } from "@/lib/conferences/public-cache";
import { checkRateLimit, clientIpFromRequest } from "@/lib/auth/rate-limit";

/**
 * Live search open conferences by name or reference.
 * GET /api/conferences/search?q=research
 */
export async function GET(request) {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(`conf-search:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (String(q).trim().length < 2) {
    return NextResponse.json({ conferences: [] });
  }

  const published = await getPublishedConferencesCached();
  const conferences = searchOpenConferences(published, q, { limit: 8 });
  return NextResponse.json({ conferences });
}
