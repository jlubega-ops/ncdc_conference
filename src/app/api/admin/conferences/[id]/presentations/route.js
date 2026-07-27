import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import {
  createConferencePresentation,
  deleteConferencePresentation,
  getConferenceDaysForPresentations,
  listConferencePresentations,
} from "@/lib/conference-content/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  const [presentations, conferenceDays] = await Promise.all([
    listConferencePresentations(id),
    getConferenceDaysForPresentations(id),
  ]);
  return NextResponse.json({ presentations, conferenceDays });
}

export async function POST(request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const form = await request.formData();
    const presentation = await createConferencePresentation(id, form);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.PRESENTATION_CREATE,
      description: "Added conference presentation",
      resourceType: "presentation",
      resourceId: presentation.id,
      conferenceId: id,
    });
    return NextResponse.json({ presentation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not add presentation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  const presentationId = new URL(request.url).searchParams.get("presentationId");
  if (!presentationId) {
    return NextResponse.json({ error: "presentationId is required." }, { status: 400 });
  }

  try {
    await deleteConferencePresentation(id, presentationId);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.PRESENTATION_DELETE,
      description: "Deleted conference presentation",
      resourceType: "presentation",
      resourceId: presentationId,
      conferenceId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete presentation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
