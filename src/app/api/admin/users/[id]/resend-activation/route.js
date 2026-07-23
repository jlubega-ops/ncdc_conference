import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/guards";
import { resendUserActivation } from "@/lib/users/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
