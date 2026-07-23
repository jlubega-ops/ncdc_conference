import { NextResponse } from "next/server";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { reviewRegistration } from "@/lib/registration/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

/** @param {string} action */
function reviewActionKey(action) {
  if (action === "approve") return ACTIVITY_ACTIONS.REGISTRATION_APPROVE;
  if (action === "request_revision") return ACTIVITY_ACTIONS.REGISTRATION_REQUEST_REVISION;
  if (action === "reject") return ACTIVITY_ACTIONS.REGISTRATION_REJECT;
  return ACTIVITY_ACTIONS.REGISTRATION_UPDATE;
}

export async function POST(request, { params }) {
  const { id, registrationId } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, adminNotes, improvementRequest } = body;

    const result = await reviewRegistration({
      registrationId,
      conferenceId: id,
      reviewerId: session.user.id,
      action,
      adminNotes,
      improvementRequest,
    });

    await logActivity({
      session,
      request,
      action: reviewActionKey(action),
      description: `Registration review: ${action} → ${result.status}`,
      resourceType: "registration",
      resourceId: registrationId,
      conferenceId: id,
      metadata: { action, status: result.status },
    });

    return NextResponse.json({ ok: true, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
