import { NextResponse } from "next/server";
import { authorizeSuperadmin } from "@/lib/auth/guards";
import { resetPasswordByAdmin } from "@/lib/users/service";
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
    const result = await resetPasswordByAdmin(id);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.USER_RESET_PASSWORD,
      description: "Reset staff account password and sent new temporary password by email",
      resourceType: "user",
      resourceId: id,
      metadata: { emailSent: result.emailSent },
    });
    return NextResponse.json({
      ok: true,
      tempPassword: result.tempPassword,
      emailSent: result.emailSent,
      message: result.message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not reset password.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
