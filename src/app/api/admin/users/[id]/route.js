import { NextResponse } from "next/server";
import { authorizeSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { deleteUserByAdmin, updateUserByAdmin } from "@/lib/users/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function PATCH(request, { params }) {
  const access = await authorizeSuperadmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updateUserByAdmin(id, body);
    if (result.errors) {
      return NextResponse.json({ errors: result.errors, error: "Validation failed." }, { status: 400 });
    }
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.USER_UPDATE,
      description: `Updated user ${result.user.email}`,
      resourceType: "user",
      resourceId: id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update user.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request, { params }) {
  const access = await authorizeSuperadmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const { id } = await params;
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { email: true, name: true },
    });
    const result = await deleteUserByAdmin(id, session.user.id);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.USER_DELETE,
      description: `Deleted user ${existing?.email || id}`,
      resourceType: "user",
      resourceId: id,
      metadata: { email: existing?.email || null },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete user.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
