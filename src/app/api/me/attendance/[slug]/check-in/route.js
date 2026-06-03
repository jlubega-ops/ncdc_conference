import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { checkInAttendance } from "@/lib/attendance/service";

export async function POST(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const detail = await checkInAttendance(session.user.id, slug);
    return NextResponse.json({ ok: true, ...detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check-in failed.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
