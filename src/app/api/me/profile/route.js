import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getUserProfile, updateUserProfile } from "@/lib/users/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getUserProfile(session.user.id);
  return NextResponse.json(data);
}

export async function PATCH(request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
