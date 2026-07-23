import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/guards";
import { createUserByAdmin, listUsersForAdmin } from "@/lib/users/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function GET() {
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await listUsersForAdmin();
  return NextResponse.json({ users });
}

export async function POST(request) {
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
