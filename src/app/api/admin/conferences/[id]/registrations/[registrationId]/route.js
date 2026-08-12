import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { mapRegistrationForAdmin, userSelect } from "@/lib/conferences/admin-data";
import { updateRegistrationAttendeeByAdmin } from "@/lib/registration/service";
import { deleteUserIfOrphanAttendee } from "@/lib/users/orphan-attendee";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

const userSelectWithProfile = {
  ...userSelect,
  profileData: true,
};

/**
 * @param {string} conferenceId
 * @param {string} registrationId
 */
async function loadRegistration(conferenceId, registrationId) {
  return prisma.conferenceRegistration.findFirst({
    where: { id: registrationId, conferenceId },
    include: { user: { select: userSelectWithProfile } },
  });
}

export async function PATCH(request, { params }) {
  const { id, registrationId } = await params;
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

  let updateResult;
  try {
    updateResult = await updateRegistrationAttendeeByAdmin({
      conferenceId: id,
      registrationId,
      formData: body.formData,
      profile: body.profile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update details.";
    const status =
      message.includes("not found") ? 404 : message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const updated = await loadRegistration(id, registrationId);
  const accessKey = await prisma.conferenceAccessKey.findFirst({
    where: {
      conferenceId: id,
      revokedAt: null,
      OR: [
        { userId: updated.userId },
        { email: updated.user.email.toLowerCase() },
      ],
    },
    select: { id: true, displayCode: true, lastUsedAt: true },
  });

  await logActivity({
    session,
    request,
    action: ACTIVITY_ACTIONS.REGISTRATION_UPDATE,
    description: updateResult.emailChanged
      ? `Updated registration and email ${updateResult.previousEmail} → ${updateResult.email}`
      : `Updated registration for ${updateResult.email}`,
    resourceType: "registration",
    resourceId: registrationId,
    conferenceId: id,
    metadata: {
      emailChanged: updateResult.emailChanged,
      accessKeyEmailed: updateResult.accessKeyEmailed,
    },
  });

  const message =
    updateResult.accessKeyIssueWarning ||
    (updateResult.emailChanged
      ? updateResult.accessKeyEmailed
        ? "Details updated. Previous access code revoked; a new code was emailed to the new address."
        : "Details updated. Email changed; no access code was issued because this registration is not approved yet."
      : "Registration details updated.");

  return NextResponse.json({
    ok: true,
    registration: mapRegistrationForAdmin(updated, {
      hasAccessKey: Boolean(accessKey),
      accessCode: accessKey?.displayCode || null,
      lastAccessAt: accessKey?.lastUsedAt || null,
    }),
    message,
    emailChanged: updateResult.emailChanged,
    accessKeyEmailed: updateResult.accessKeyEmailed,
  });
}

export async function DELETE(request, { params }) {
  const { id, registrationId } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* empty body ok if confirm sent as query — still require JSON confirm */
  }

  if (String(body.confirm || "").trim() !== "DELETE") {
    return NextResponse.json(
      { error: "Type DELETE to confirm removal of this registration." },
      { status: 400 },
    );
  }

  const registration = await loadRegistration(id, registrationId);
  if (!registration) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  const email = registration.user.email.toLowerCase();
  const userId = registration.userId;

  await prisma.$transaction([
    prisma.conferenceAttendance.deleteMany({
      where: { conferenceId: id, userId },
    }),
    prisma.conferenceFeedback.deleteMany({
      where: { conferenceId: id, userId },
    }),
    prisma.conferenceCertificate.deleteMany({
      where: { conferenceId: id, userId },
    }),
    prisma.conferenceGiftIssuance.deleteMany({
      where: { conferenceId: id, userId },
    }),
    prisma.paperSubmission.deleteMany({
      where: { conferenceId: id, userId },
    }),
    prisma.conferenceAccessKey.deleteMany({
      where: {
        conferenceId: id,
        OR: [{ userId }, { email }],
      },
    }),
    prisma.userRole.deleteMany({
      where: {
        userId,
        conferenceId: id,
        role: "ATTENDEE",
      },
    }),
    prisma.conferenceRegistration.delete({
      where: { id: registration.id },
    }),
  ]);

  const userDeleted = await deleteUserIfOrphanAttendee(userId, id);

  await logActivity({
    session,
    request,
    action: ACTIVITY_ACTIONS.REGISTRATION_DELETE,
    description: userDeleted
      ? `Removed registration for ${email} and deleted their account (only belonged to this conference).`
      : `Removed registration for ${email}`,
    resourceType: "registration",
    resourceId: registration.id,
    conferenceId: id,
    metadata: { userDeleted, email },
  });

  if (userDeleted) {
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.USER_DELETE,
      description: `Deleted attendee ${email} after removing their only conference registration.`,
      resourceType: "user",
      resourceId: userId,
      conferenceId: id,
      metadata: { email, reason: "orphan_attendee_after_registration_delete" },
    });
  }

  return NextResponse.json({
    ok: true,
    userDeleted,
    message: userDeleted
      ? "Registration removed. The attendee account was also deleted because they only belonged to this conference."
      : "Registration removed from this conference. The attendee account was kept because they belong to other conferences or hold staff roles.",
  });
}
