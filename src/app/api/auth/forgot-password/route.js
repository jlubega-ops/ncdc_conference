import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";
import { passwordResetEmail } from "@/lib/email/templates";
import { getAppUrl } from "@/lib/email/config";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request) {
  try {
    const { email } = await request.json();
    const normalized = email?.trim()?.toLowerCase();

    if (!normalized) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (user?.passwordHash) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date();
      expires.setHours(expires.getHours() + 1);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: expires,
        },
      });

      const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
      await sendEmail({
        to: normalized,
        ...passwordResetEmail({
          name: user.name,
          resetUrl,
        }),
      });
    }

    await logActivity({
      request,
      action: ACTIVITY_ACTIONS.AUTH_FORGOT_PASSWORD,
      description: "Password reset requested",
      resourceType: "user",
      actorEmail: normalized,
      metadata: { accountFound: Boolean(user?.passwordHash) },
    });

    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, we sent password reset instructions.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Could not process request." }, { status: 500 });
  }
}
