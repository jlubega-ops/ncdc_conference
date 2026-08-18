import { jsonNoStore } from "@/lib/http/no-store";
import { requireSession } from "@/lib/auth/session";
import { checkInAttendance } from "@/lib/attendance/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const session = await requireSession();
  if (!session) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const detail = await checkInAttendance(session.user.id, slug);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.ATTENDANCE_CHECK_IN,
      description: `Self check-in for ${detail.conference?.title || slug}`,
      resourceType: "attendance",
      conferenceId: detail.conference?.id ?? null,
      metadata: { slug, dayDate: detail.today?.date ?? null },
    });
    return jsonNoStore({ ok: true, ...detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check-in failed.";
    const status = message.includes("not found") ? 404 : 400;
    return jsonNoStore({ error: message }, { status });
  }
}
