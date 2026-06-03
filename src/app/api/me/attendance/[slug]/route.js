import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getAttendanceConferenceDetail } from "@/lib/attendance/service";

export async function GET(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const detail = await getAttendanceConferenceDetail(session.user.id, slug);
    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load attendance.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
