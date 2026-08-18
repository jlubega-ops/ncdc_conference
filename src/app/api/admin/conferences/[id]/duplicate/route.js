import { NextResponse } from "next/server";
import { authorizeSuperadmin } from "@/lib/auth/guards";
import { duplicateConference } from "@/lib/conferences/duplicate";
import { revalidateConferenceCache } from "@/lib/conferences/public-cache";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

/**
 * Duplicate a conference as a new draft titled "{title} - copy" (superadmin only).
 */
export async function POST(request, { params }) {
  const { id } = await params;
  const access = await authorizeSuperadmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

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
    revalidateConferenceCache({
      id: result.conference.id,
      slug: result.conference.slug,
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
