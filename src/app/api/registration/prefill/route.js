import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getRegistrationPrefill } from "@/lib/users/service";
import { checkRateLimit, clientIpFromRequest } from "@/lib/auth/rate-limit";

export async function GET() {
  return NextResponse.json(
    { error: "Use POST while signed in to load your profile for registration." },
    { status: 405 },
  );
}

/**
 * Prefill only for the authenticated user's own email — never lookup by arbitrary email.
 */
export async function POST(request) {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(`prefill:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const session = await requireSession();
  if (!session) {
    // Guests must not enumerate profiles by email.
    return NextResponse.json({ prefill: null });
  }

  const email = session.user.email.toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ prefill: null });
  }

  const prefill = await getRegistrationPrefill(email);
  return NextResponse.json({ prefill: prefill ?? null });
}
