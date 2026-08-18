import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { sendAccessCodesBulk } from "@/lib/registration/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const { id: conferenceId } = await params;
  const access = await authorizeConferenceAccess(conferenceId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const registrationIds = Array.isArray(body.registrationIds) ? body.registrationIds : [];
    const results = await sendAccessCodesBulk({ conferenceId, registrationIds });

    if (!body.silent) {
      await logActivity({
        session,
        request,
        action: ACTIVITY_ACTIONS.REGISTRATION_BULK_SEND_ACCESS,
        description: `Sent access codes to ${results.sent} attendee(s)${
          results.failed.length ? ` (${results.failed.length} failed)` : ""
        }.`,
        resourceType: "registration",
        conferenceId,
        metadata: {
          requested: registrationIds.length,
          sent: results.sent,
          failed: results.failed.length,
        },
      });
    }

    const message =
      results.failed.length === 0
        ? `Access codes emailed to ${results.sent} attendee(s). Previous codes for those people no longer work.`
        : `Emailed ${results.sent} of ${registrationIds.length}. ${results.failed.length} could not be sent.`;

    return NextResponse.json({
      ok: results.failed.length === 0,
      message,
      ...results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send access codes.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
