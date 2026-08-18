import { NextResponse } from "next/server";
import { authorizeSuperadmin } from "@/lib/auth/guards";
import { createUserByAdmin, listUsersForAdmin } from "@/lib/users/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";
import { jsonNoStore } from "@/lib/http/no-store";

export async function GET() {
  const access = await authorizeSuperadmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const users = await listUsersForAdmin();
  return jsonNoStore({ users });
}

export async function POST(request) {
  const access = await authorizeSuperadmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const body = await request.json();
    const result = await createUserByAdmin(body);
    if (result.errors) {
      return NextResponse.json({ errors: result.errors, error: "Validation failed." }, { status: 400 });
    }
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.USER_CREATE,
      description: `Created user ${result.user.email}`,
      resourceType: "user",
      resourceId: result.user.id,
      metadata: { emailSent: result.emailSent },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
