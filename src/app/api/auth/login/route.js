import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  createUserSession,
  resolveLoginActiveRole,
  setSessionCookie,
} from "@/lib/auth/session";
import { STAFF_ROLES } from "@/lib/auth/roles";

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
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
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

    let redirect = "/dashboard";
    if (!user.roles.some((r) => STAFF_ROLES.includes(r.role))) {
      redirect = "/dashboard/my-registrations";
    }

    const response = NextResponse.json({
      ok: true,
      redirect,
      mustChangePassword: user.mustChangePassword,
    });
    await setSessionCookie(response, token);
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Unable to sign in. Please try again." },
      { status: 500 },
    );
  }
}
