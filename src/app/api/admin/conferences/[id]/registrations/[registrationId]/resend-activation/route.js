import { NextResponse } from "next/server";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { resendAccountActivation } from "@/lib/registration/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const { id, registrationId } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resendAccountActivation({ registrationId, conferenceId: id });
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.REGISTRATION_RESEND_ACCESS,
      description: "Resent attendee access code email",
      resourceType: "registration",
      resourceId: registrationId,
      conferenceId: id,
    });
    return NextResponse.json({
      ok: true,
      message: result.message || "Access code emailed.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resend access code.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
