import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    if (user.mustChangePassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Enter your temporary password from the welcome email." },
          { status: 400 },
        );
      }
    } else if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required." },
        { status: 400 },
      );
    }

    if (currentPassword) {
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        temporaryPassword: null,
      },
    });

    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.AUTH_CHANGE_PASSWORD,
      description: "Password changed",
      resourceType: "user",
      resourceId: user.id,
    });

    return NextResponse.json({ ok: true, redirect: "/dashboard/my-registrations" });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Could not update password." }, { status: 500 });
  }
}
