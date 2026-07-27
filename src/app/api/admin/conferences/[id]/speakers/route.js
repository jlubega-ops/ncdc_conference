import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import {
  getConferenceSpeakers,
  updateConferenceSpeakers,
} from "@/lib/conference-content/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  const speakers = await getConferenceSpeakers(id);
  return NextResponse.json({ speakers });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const body = await request.json();
    const speakers = await updateConferenceSpeakers(id, body.speakers);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.CONFERENCE_SPEAKERS_UPDATE,
      description: `Updated speakers (${speakers.length} total)`,
      resourceType: "conference",
      resourceId: id,
      conferenceId: id,
      metadata: { speakerCount: speakers.length },
    });
    return NextResponse.json({ speakers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update speakers.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
