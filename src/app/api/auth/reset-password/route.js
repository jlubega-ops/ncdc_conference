import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password || password.length < 8) {
      return NextResponse.json(
        { error: "A valid token and password (min 8 characters) are required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: false,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await logActivity({
      request,
      action: ACTIVITY_ACTIONS.AUTH_RESET_PASSWORD,
      description: "Password reset completed",
      resourceType: "user",
      resourceId: user.id,
      actorEmail: user.email,
    });

    return NextResponse.json({ ok: true, message: "Password updated. You can sign in now." });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Could not reset password." }, { status: 500 });
  }
}
