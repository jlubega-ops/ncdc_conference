import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getUserProfile, updateUserProfile } from "@/lib/users/service";
import { isAttendeeProfileLocked } from "@/lib/users/profile-lock";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getUserProfile(session.user.id);
  const profileLocked =
    session.activeRole === "ATTENDEE"
      ? await isAttendeeProfileLocked(session.user.id, session.activeConferenceId)
      : false;
  return NextResponse.json({ ...data, profileLocked });
}

export async function PATCH(request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (session.activeRole === "ATTENDEE") {
      const locked = await isAttendeeProfileLocked(
        session.user.id,
        session.activeConferenceId,
      );
      if (locked) {
        return NextResponse.json(
          {
            error:
              "Your details were uploaded by the organisers and cannot be changed here. Contact the conference administrators if something is incorrect.",
          },
          { status: 403 },
        );
      }
    }

    const body = await request.json();
    const result = await updateUserProfile(session.user.id, body);
    if (result.errors) {
      return NextResponse.json({ errors: result.errors, error: "Validation failed." }, { status: 400 });
    }
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.PROFILE_UPDATE,
      description: "Updated profile",
      resourceType: "user",
      resourceId: session.user.id,
    });
    return NextResponse.json({ ok: true, profile: result.profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
