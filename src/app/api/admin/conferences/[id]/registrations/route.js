import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { mapRegistrationForAdmin, userSelect } from "@/lib/conferences/admin-data";
import { addAttendeeByAdmin, listRepresentativesForConference } from "@/lib/registration/admin-attendee";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

/**
 * @param {Array<{ email: string; userId: string | null; lastUsedAt: Date | null; displayCode: string | null; emailedAt?: Date | null }>} accessKeys
 * @param {{ userId?: string; email?: string }} row
 */
function resolveAccessKeyMeta(accessKeys, row) {
  const email = row.email?.toLowerCase();
  let latest = null;
  let displayCode = null;
  let emailedAt = null;
  for (const key of accessKeys) {
    const matchesUser = row.userId && key.userId === row.userId;
    const matchesEmail = email && key.email?.toLowerCase() === email;
    if (!matchesUser && !matchesEmail) continue;
    if (key.displayCode) displayCode = key.displayCode;
    if (key.emailedAt && (!emailedAt || key.emailedAt > emailedAt)) {
      emailedAt = key.emailedAt;
    }
    if (key.lastUsedAt && (!latest || key.lastUsedAt > latest)) {
      latest = key.lastUsedAt;
    }
  }
  return { lastAccessAt: latest, accessCode: displayCode, emailedAt };
}

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [rows, accessKeys, representativeLinks] = await Promise.all([
    prisma.conferenceRegistration.findMany({
      where: { conferenceId: id },
      include: { user: { select: userSelect } },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.conferenceAccessKey.findMany({
      where: { conferenceId: id, revokedAt: null },
      select: {
        email: true,
        userId: true,
        lastUsedAt: true,
        displayCode: true,
        emailedAt: true,
      },
    }),
    listRepresentativesForConference(id),
  ]);

  const repsByPrincipal = new Map();
  const repsByRepresentative = new Map();
  for (const link of representativeLinks) {
    if (!repsByPrincipal.has(link.principalUserId)) {
      repsByPrincipal.set(link.principalUserId, []);
    }
    repsByPrincipal.get(link.principalUserId).push(link.representative);
    if (!repsByRepresentative.has(link.representativeUserId)) {
      repsByRepresentative.set(link.representativeUserId, []);
    }
    repsByRepresentative.get(link.representativeUserId).push(link.principal);
  }

  const keyEmails = new Set(accessKeys.map((k) => k.email.toLowerCase()));
  const keyUserIds = new Set(accessKeys.map((k) => k.userId).filter(Boolean));

  return NextResponse.json({
    registrations: rows.map((row) => {
      const email = row.user?.email?.toLowerCase();
      const hasAccessKey =
        (email && keyEmails.has(email)) || (row.userId && keyUserIds.has(row.userId));
      const meta = resolveAccessKeyMeta(accessKeys, {
        userId: row.userId,
        email,
      });
      return mapRegistrationForAdmin(row, {
        hasAccessKey: Boolean(hasAccessKey),
        lastAccessAt: meta.lastAccessAt,
        accessCode: meta.accessCode,
        accessCodeSent: Boolean(meta.emailedAt),
        representatives: repsByPrincipal.get(row.userId) || [],
        representing: repsByRepresentative.get(row.userId) || [],
      });
    }),
  });
}

export async function POST(request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const result = await addAttendeeByAdmin({
      conferenceId: id,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      comment: body.comment,
      organisation: body.organisation ?? body.institution,
      forceDuplicate: Boolean(body.forceDuplicate),
    });

    if (result.needsConfirmation) {
      return NextResponse.json(result, { status: 409 });
    }

    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.REGISTRATION_ADD_ATTENDEE,
      description: `Admin added attendee ${result.registration.user.email}`,
      resourceType: "registration",
      resourceId: result.registration.id,
      conferenceId: id,
    });

    const accessKeys = await prisma.conferenceAccessKey.findMany({
      where: {
        conferenceId: id,
        revokedAt: null,
        OR: [
          { userId: result.registration.userId },
          { email: result.registration.user.email.toLowerCase() },
        ],
      },
      select: {
        email: true,
        userId: true,
        lastUsedAt: true,
        displayCode: true,
        emailedAt: true,
      },
    });
    const meta = resolveAccessKeyMeta(accessKeys, {
      userId: result.registration.userId,
      email: result.registration.user.email,
    });

    return NextResponse.json({
      ok: true,
      message: result.message,
      accessKey: result.accessKey,
      emailSent: result.emailSent,
      emailOmitted: result.emailOmitted,
      registration: mapRegistrationForAdmin(result.registration, {
        hasAccessKey: Boolean(meta.accessCode || result.accessKey),
        lastAccessAt: meta.lastAccessAt,
        accessCode: meta.accessCode || result.accessKey,
        accessCodeSent: Boolean(meta.emailedAt),
        representatives: [],
        representing: [],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not add attendee.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
