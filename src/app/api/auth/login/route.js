import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  createUserSession,
  resolveLoginActiveRole,
  setSessionCookie,
} from "@/lib/auth/session";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: true },
    });

    if (!user?.passwordHash) {
      await logActivity({
        request,
        action: ACTIVITY_ACTIONS.AUTH_LOGIN_FAILED,
        description: "Staff login failed: invalid email or password",
        resourceType: "user",
        actorEmail: normalizedEmail,
        success: false,
      });
      return NextResponse.json(
        {
          error:
            "Invalid email or password. Attendees sign in with an access code (Attendee access).",
        },
        { status: 401 },
      );
    }

    const isStaff = user.roles.some((r) => STAFF_ROLES.includes(r.role));
    if (!isStaff) {
      return NextResponse.json(
        {
          error:
            "Attendees sign in with an access code, not a password. Use the Attendee access tab.",
          code: "ATTENDEE_USE_ACCESS_KEY",
          redirect: "/login?mode=access",
        },
        { status: 403 },
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await logActivity({
        request,
        action: ACTIVITY_ACTIONS.AUTH_LOGIN_FAILED,
        description: "Staff login failed: invalid email or password",
        resourceType: "user",
        resourceId: user.id,
        actorEmail: normalizedEmail,
        success: false,
      });
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const activeRole = await resolveLoginActiveRole(user.id);
    if (!activeRole) {
      return NextResponse.json(
        { error: "No roles assigned to this account." },
        { status: 403 },
      );
    }

    const token = await createUserSession(user.id, activeRole, request);

    const response = NextResponse.json({
      ok: true,
      redirect: "/dashboard",
      mustChangePassword: user.mustChangePassword,
    });
    await setSessionCookie(response, token);
    await logActivity({
      session: { user: { id: user.id, email: user.email, name: user.name }, activeRole },
      request,
      action: ACTIVITY_ACTIONS.AUTH_LOGIN,
      description: `Staff signed in as ${activeRole}`,
      resourceType: "user",
      resourceId: user.id,
    });
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Unable to sign in. Please try again." },
      { status: 500 },
    );
  }
}
