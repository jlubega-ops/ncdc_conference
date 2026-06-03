import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  getAllAttendanceSummaries,
  getRunningAttendanceConferences,
} from "@/lib/attendance/service";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [conferences, history] = await Promise.all([
    getRunningAttendanceConferences(session.user.id),
    getAllAttendanceSummaries(session.user.id),
  ]);

  return NextResponse.json({ conferences, history });
}
