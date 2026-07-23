import { NextResponse } from "next/server";
import { getSessionRecord, switchActiveRole } from "@/lib/auth/session";
import { ROLE_HIERARCHY } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request) {
  try {
    const record = await getSessionRecord();
    if (!record) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { role } = await request.json();
    if (!role || !ROLE_HIERARCHY.includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const session = await switchActiveRole(record.userId, role);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.AUTH_SWITCH_ROLE,
      description: `Switched active role to ${role}`,
      resourceType: "user",
      resourceId: record.userId,
      metadata: { role },
    });
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Switch failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
