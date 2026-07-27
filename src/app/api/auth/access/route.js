import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessKey } from "@/lib/auth/password";
import { accessKeyLookupToken, parseAccessKey } from "@/lib/auth/access-key";
import { normalizeOrganiserShortName } from "@/lib/conferences/reference";
import { createUserSession, setSessionCookie } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";
import { checkRateLimit, clientIpFromRequest } from "@/lib/auth/rate-limit";

export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const limit = checkRateLimit(`access:${ip}`, { limit: 15, windowMs: 60_000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again shortly." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const rawKey = body.accessKey ?? "";
    const emailHint = (body.email ?? "").trim().toLowerCase();

    if (!rawKey?.trim()) {
      return NextResponse.json({ error: "Access key is required." }, { status: 400 });
    }

    const parsed = parseAccessKey(rawKey);
    if (!parsed) {
      await logActivity({
        request,
        action: ACTIVITY_ACTIONS.AUTH_ACCESS_KEY_FAILED,
        description: "Access key login failed: invalid format",
        success: false,
        metadata: { emailHint: emailHint || null },
      });
      return NextResponse.json(
        {
          error:
            "Invalid access key format. Use the full key from your email, e.g. ORG/CONF2027/ABCDEFGH (all caps).",
          code: "INVALID_KEY_FORMAT",
        },
        { status: 400 },
      );
    }

    const lookup = accessKeyLookupToken(parsed.fullKey);
    const keys = await prisma.conferenceAccessKey.findMany({
      where: {
        conferenceYear: parsed.year,
        revokedAt: null,
        OR: [
          { keySuffix: lookup },
          // Legacy rows stored plaintext suffix before encryption change.
          { keySuffix: parsed.suffix },
        ],
        ...(emailHint ? { email: emailHint } : {}),
      },
      include: { conference: true },
    });

    let matchedKey = null;
    for (const record of keys) {
      if (record.expiresAt && record.expiresAt < new Date()) continue;
      const org = normalizeOrganiserShortName(record.conference?.organiserShortName);
      if (parsed.org !== org) continue;
      const valid = await verifyAccessKey(parsed.fullKey, record.keyHash);
      if (valid) {
        matchedKey = record;
        break;
      }
    }

    if (!matchedKey) {
      await logActivity({
        request,
        action: ACTIVITY_ACTIONS.AUTH_ACCESS_KEY_FAILED,
        description: "Access key login failed: invalid or expired code",
        success: false,
        metadata: { emailHint: emailHint || null, year: parsed.year },
      });
      return NextResponse.json(
        {
          error:
            "Invalid access code. Enter the full code exactly as sent (ORG/CONF[YEAR]/[CODE]).",
          code: "INVALID_KEY",
        },
        { status: 401 },
      );
    }

    const email = matchedKey.email.trim().toLowerCase();
    const { conference } = matchedKey;
    if (!conference?.slug) {
      return NextResponse.json({ error: "Conference not found for this access code." }, { status: 404 });
    }

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
            error: `Your registration for ${conference.title} is pending approval. You will receive an access code by email once it is approved.`,
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
      }
    }

    await prisma.conferenceAccessKey.update({
      where: { id: matchedKey.id },
      data: { userId: user.id, lastUsedAt: new Date() },
    });

    const token = await createUserSession(user.id, "ATTENDEE", request, {
      activeConferenceId: conference.id,
    });
    const redirect = `/conferences/${conference.slug}`;
    const response = NextResponse.json({
      ok: true,
      redirect,
      conferenceId: conference.id,
      conferenceSlug: conference.slug,
    });
    await setSessionCookie(response, token, "ATTENDEE");
    await logActivity({
      session: {
        user: { id: user.id, email: user.email, name: user.name },
        activeRole: "ATTENDEE",
      },
      request,
      action: ACTIVITY_ACTIONS.AUTH_ACCESS_KEY,
      description: `Signed in with access key for ${conference.title}`,
      resourceType: "user",
      resourceId: user.id,
      conferenceId: conference.id,
      metadata: { conferenceSlug: conference.slug },
    });
    return response;
  } catch (err) {
    console.error("Access login error:", err);
    return NextResponse.json(
      { error: "Unable to verify access. Please try again." },
      { status: 500 },
    );
  }
}
