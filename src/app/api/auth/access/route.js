import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessKey } from "@/lib/auth/password";
import {
  accessKeyLookupToken,
  normalizeAccessCodeInput,
  parseAccessKey,
} from "@/lib/auth/access-key";
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
            "Invalid access code format. Enter the 4-character code from your email (letters and numbers; no I, O, 0, 1, or L).",
          code: "INVALID_KEY_FORMAT",
        },
        { status: 400 },
      );
    }

    /** @type {any[]} */
    let candidates = [];

    if (parsed.kind === "short") {
      candidates = await prisma.conferenceAccessKey.findMany({
        where: {
          revokedAt: null,
          OR: [{ displayCode: parsed.code }, { keySuffix: parsed.code }],
          ...(emailHint ? { email: emailHint } : {}),
        },
        include: { conference: true },
      });
    } else {
      const lookup = accessKeyLookupToken(parsed.fullKey);
      candidates = await prisma.conferenceAccessKey.findMany({
        where: {
          conferenceYear: parsed.year,
          revokedAt: null,
          OR: [{ keySuffix: lookup }, { keySuffix: parsed.suffix }],
          ...(emailHint ? { email: emailHint } : {}),
        },
        include: { conference: true },
      });
    }

    let matchedKey = null;
    let expiredMatch = false;
    const now = new Date();

    for (const record of candidates) {
      let valid = false;
      if (parsed.kind === "short") {
        valid =
          (await verifyAccessKey(parsed.code, record.keyHash)) ||
          (record.displayCode &&
            normalizeAccessCodeInput(record.displayCode) === parsed.code);
      } else {
        const org = normalizeOrganiserShortName(record.conference?.organiserShortName);
        if (parsed.org !== org) continue;
        valid = await verifyAccessKey(parsed.fullKey, record.keyHash);
      }
      if (!valid) continue;
      if (record.expiresAt && record.expiresAt < now) {
        expiredMatch = true;
        continue;
      }
      matchedKey = record;
      break;
    }

    if (!matchedKey && expiredMatch) {
      await logActivity({
        request,
        action: ACTIVITY_ACTIONS.AUTH_ACCESS_KEY_FAILED,
        description: "Access key login failed: expired code",
        success: false,
        metadata: { emailHint: emailHint || null },
      });
      return NextResponse.json(
        {
          error:
            "This access code has expired. Contact the organisers if you need a new code.",
          code: "EXPIRED_KEY",
        },
        { status: 403 },
      );
    }

    if (!matchedKey) {
      await logActivity({
        request,
        action: ACTIVITY_ACTIONS.AUTH_ACCESS_KEY_FAILED,
        description: "Access key login failed: invalid or expired code",
        success: false,
        metadata: { emailHint: emailHint || null, year: parsed.year ?? null },
      });
      return NextResponse.json(
        {
          error: "Invalid access code. Enter the code exactly as sent in your email.",
          code: "INVALID_KEY",
        },
        { status: 401 },
      );
    }

    const email = matchedKey.email.trim().toLowerCase();
    const { conference } = matchedKey;
    if (!conference?.slug) {
      return NextResponse.json(
        { error: "Conference not found for this access code.", code: "CONFERENCE_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (conference.publicationStatus !== "PUBLISHED") {
      await logActivity({
        request,
        action: ACTIVITY_ACTIONS.AUTH_ACCESS_KEY_FAILED,
        description: `Access key login blocked: ${conference.title} is not published`,
        success: false,
        conferenceId: conference.id,
        metadata: { conferenceSlug: conference.slug, publicationStatus: conference.publicationStatus },
      });
      return NextResponse.json(
        {
          error:
            "This conference is not yet open for access. Please try again after the organisers publish it.",
          code: "CONFERENCE_NOT_PUBLISHED",
        },
        { status: 403 },
      );
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

      if (registration?.status === "NEEDS_REVISION") {
        return NextResponse.json(
          {
            error: `Your registration for ${conference.title} needs updates before you can access it. Check your email for details, or contact the organisers.`,
            code: "NEEDS_REVISION",
          },
          { status: 403 },
        );
      }

      if (registration?.status === "CANCELLED") {
        return NextResponse.json(
          {
            error: `Your registration for ${conference.title} has been cancelled. Contact the organisers if you think this is a mistake.`,
            code: "REGISTRATION_CANCELLED",
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
