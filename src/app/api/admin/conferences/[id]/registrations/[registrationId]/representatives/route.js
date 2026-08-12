import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { assignRepresentativeByAdmin } from "@/lib/registration/admin-attendee";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const { id, registrationId } = await params;
  const access = await authorizeConferenceAccess(id);
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
    const result = await assignRepresentativeByAdmin({
      conferenceId: id,
      principalRegistrationId: registrationId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      notes: body.notes,
      forceExisting: Boolean(body.forceExisting),
      createdById: session?.user?.id || null,
    });

    if (result.needsConfirmation) {
      return NextResponse.json(result, { status: 409 });
    }

    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.REGISTRATION_ASSIGN_REPRESENTATIVE,
      description: `Assigned representative ${result.representative.user.email}`,
      resourceType: "registration",
      resourceId: registrationId,
      conferenceId: id,
      metadata: { representativeId: result.representative.id },
    });

    return NextResponse.json({
      ok: true,
      message: result.message,
      representative: result.representative,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not assign representative.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
