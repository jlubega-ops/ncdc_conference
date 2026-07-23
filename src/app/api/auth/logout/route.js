import { NextResponse } from "next/server";
import { clearSessionCookie, destroySession, getSessionRecord } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request) {
  const record = await getSessionRecord();
  await destroySession();
  const response = NextResponse.json({ ok: true, redirect: "/" });
  await clearSessionCookie(response);
  if (record?.user) {
    await logActivity({
      session: { user: record.user, activeRole: record.activeRole },
      request,
      action: ACTIVITY_ACTIONS.AUTH_LOGOUT,
      description: `Signed out: ${record.user.email}`,
      resourceType: "user",
      resourceId: record.user.id,
    });
  }
  return response;
}
