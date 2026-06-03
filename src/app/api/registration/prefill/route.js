import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getRegistrationPrefill } from "@/lib/users/service";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function GET() {
  return NextResponse.json(
    { error: "Use POST or sign in to load your profile for registration." },
    { status: 405 },
  );
}

export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const limit = checkRateLimit(`prefill:${ip}`, { limit: 15, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const session = await requireSession();
  let email = "";

  if (session) {
    email = session.user.email.toLowerCase();
  } else {
    try {
      const body = await request.json();
      email = String(body.email ?? "")
        .trim()
        .toLowerCase();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ prefill: null });
  }

  if (session && email !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const prefill = await getRegistrationPrefill(email);
  return NextResponse.json({ prefill: prefill ?? null });
}
