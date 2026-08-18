import { requireSession } from "@/lib/auth/session";
import { jsonNoStore } from "@/lib/http/no-store";
import {
  getAllAttendanceSummaries,
  getRunningAttendanceConferences,
} from "@/lib/attendance/service";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const [conferences, history] = await Promise.all([
    getRunningAttendanceConferences(session.user.id),
    getAllAttendanceSummaries(session.user.id),
  ]);

  return jsonNoStore({ conferences, history });
}
