import { NextResponse } from "next/server";
import { authorizeSuperadmin } from "@/lib/auth/guards";
import { resendUserActivation } from "@/lib/users/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const access = await authorizeSuperadmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const { id } = await params;
    await resendUserActivation(id);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.USER_RESEND_ACTIVATION,
      description: "Resent staff account activation email",
      resourceType: "user",
      resourceId: id,
    });
    return NextResponse.json({
      ok: true,
      message: "Activation email sent with a new temporary password.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resend activation.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
