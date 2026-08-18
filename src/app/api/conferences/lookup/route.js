import { NextResponse } from "next/server";
import { getOpenConferenceByCodeOrReference } from "@/lib/conferences/service";
import { checkRateLimit, clientIpFromRequest } from "@/lib/auth/rate-limit";

/**
 * Exact lookup by conference code (slug) or reference.
 * GET /api/conferences/lookup?code=K7M2P-2027
 */
export async function GET(request) {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(`conf-lookup:${ip}`, { limit: 40, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("code") || searchParams.get("reference") || "";

  if (!String(raw).trim()) {
    return NextResponse.json({ error: "Enter a conference code." }, { status: 400 });
  }

  const conference = await getOpenConferenceByCodeOrReference(raw);
  if (!conference) {
    return NextResponse.json(
      { error: "No open conference found with that code." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    conference: {
      slug: conference.slug,
      reference: conference.reference,
      title: conference.title,
      href: `/conferences/${conference.slug}`,
    },
  });
}
