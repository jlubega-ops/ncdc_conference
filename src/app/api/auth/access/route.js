import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessKey } from "@/lib/auth/password";
import { parseAccessKey } from "@/lib/auth/access-key";
import {
  createUserSession,
  resolveLoginActiveRole,
  setSessionCookie,
} from "@/lib/auth/session";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body.email ?? "").trim().toLowerCase();
    const rawKey = body.accessKey ?? "";

    if (!email || !rawKey?.trim()) {
      return NextResponse.json(
        { error: "Email and access key are required." },
        { status: 400 },
      );
    }

    const parsed = parseAccessKey(rawKey);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Invalid access key format. Use the full key from your email, e.g. NCDC/Conf2027/ABCDEFGH (uppercase, no spaces).",
          code: "INVALID_KEY_FORMAT",
        },
        { status: 400 },
      );
    }

    const keys = await prisma.conferenceAccessKey.findMany({
      where: {
        email,
        conferenceYear: parsed.year,
        keySuffix: parsed.suffix,
        revokedAt: null,
      },
      include: { conference: true },
    });

    let matchedKey = null;
    for (const record of keys) {
      if (record.expiresAt && record.expiresAt < new Date()) continue;
      const valid = await verifyAccessKey(parsed.fullKey, record.keyHash);
      if (valid) {
        matchedKey = record;
        break;
      }
    }

    if (!matchedKey) {
      const pendingRegistration = await prisma.conferenceRegistration.findFirst({
        where: {
          user: { email },
          conference: { startDate: { not: null } },
          status: "PENDING",
        },
        include: { conference: true, user: true },
      });

      if (pendingRegistration) {
        return NextResponse.json(
          {
            error: `Your registration for ${pendingRegistration.conference.title} is awaiting admin activation. You cannot sign in until your account is activated and an access key is issued.`,
            code: "PENDING_ACTIVATION",
          },
          { status: 403 },
        );
      }

      return NextResponse.json(
        {
          error:
            "Invalid access key for this email. Check that you entered the full key exactly as sent (NCDC/Conf[year]/[code]).",
          code: "INVALID_KEY",
        },
        { status: 401 },
      );
    }

    const { conference } = matchedKey;

    let user = await prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0],
          roles: {
            create: {
              role: "ATTENDEE",
              conferenceId: conference.id,
            },
          },
        },
        include: { roles: true },
      });
    } else {
      const registration = await prisma.conferenceRegistration.findUnique({
        where: {
          conferenceId_userId: {
            conferenceId: conference.id,
            userId: user.id,
          },
        },
      });

      if (registration?.status === "PENDING") {
        return NextResponse.json(
          {
            error: `Your registration for ${conference.title} is awaiting admin activation. Use your access key after approval.`,
            code: "PENDING_ACTIVATION",
          },
          { status: 403 },
        );
      }

      const hasAttendee = user.roles.some(
        (r) => r.role === "ATTENDEE" && r.conferenceId === conference.id,
      );
      if (!hasAttendee) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            role: "ATTENDEE",
            conferenceId: conference.id,
          },
        });
        user = await prisma.user.findUnique({
          where: { id: user.id },
          include: { roles: true },
        });
      }
    }

    await prisma.conferenceAccessKey.update({
      where: { id: matchedKey.id },
      data: { userId: user.id },
    });

    const activeRole = await resolveLoginActiveRole(user.id);
    if (!activeRole) {
      return NextResponse.json({ error: "No roles assigned." }, { status: 403 });
    }

    const token = await createUserSession(user.id, activeRole, request);
    const response = NextResponse.json({
      ok: true,
      redirect: "/dashboard",
    });
    await setSessionCookie(response, token);
    return response;
  } catch (err) {
    console.error("Access login error:", err);
    return NextResponse.json(
      { error: "Unable to verify access. Please try again." },
      { status: 500 },
    );
  }
}
