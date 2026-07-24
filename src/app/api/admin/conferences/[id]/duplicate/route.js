import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/guards";
import { duplicateConference } from "@/lib/conferences/duplicate";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

/**
 * Duplicate a conference as a new draft titled "{title} - copy" (superadmin only).
 */
export async function POST(request, { params }) {
  const { id } = await params;
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json(
      { error: "Only system administrators can duplicate conferences." },
      { status: 401 },
    );
  }

  try {
    const result = await duplicateConference(id, session.user.id);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.CONFERENCE_DUPLICATE,
      description: `Duplicated conference "${result.sourceTitle}" as "${result.conference.title}".`,
      resourceType: "conference",
      resourceId: result.conference.id,
      conferenceId: result.conference.id,
      metadata: {
        sourceConferenceId: id,
        sourceTitle: result.sourceTitle,
      },
    });
    return NextResponse.json({
      ok: true,
      conference: result.conference,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not duplicate conference.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
