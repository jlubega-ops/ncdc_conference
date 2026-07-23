import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { mapRegistrationForAdmin, userSelect } from "@/lib/conferences/admin-data";
import { buildProfilePayload, getProfileFromUser } from "@/lib/users/profile";
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
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const registration = await loadRegistration(id, registrationId);
  if (!registration) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  const existingForm =
    registration.formData && typeof registration.formData === "object"
      ? registration.formData
      : {};
  const incoming =
    body.formData && typeof body.formData === "object" ? body.formData : body.profile || {};

  const profile = buildProfilePayload({
    ...getProfileFromUser(registration.user),
    ...existingForm,
    ...incoming,
  });

  const formData = {
    ...existingForm,
    ...incoming,
    ...profile,
    email: registration.user.email,
  };

  const name = profile.fullName || registration.user.name;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: registration.userId },
      data: {
        name,
        profileData: profile,
      },
    }),
    prisma.conferenceRegistration.update({
      where: { id: registration.id },
      data: { formData },
    }),
  ]);

  const updated = await loadRegistration(id, registrationId);
  const accessKey = await prisma.conferenceAccessKey.findFirst({
    where: {
      conferenceId: id,
      revokedAt: null,
      OR: [
        { userId: registration.userId },
        { email: registration.user.email.toLowerCase() },
      ],
    },
  });

  await logActivity({
    session,
    request,
    action: ACTIVITY_ACTIONS.REGISTRATION_UPDATE,
    description: `Updated registration for ${registration.user.email}`,
    resourceType: "registration",
    resourceId: registration.id,
    conferenceId: id,
  });

  return NextResponse.json({
    ok: true,
    registration: mapRegistrationForAdmin(updated, { hasAccessKey: Boolean(accessKey) }),
    message: "Registration details updated.",
  });
}

export async function DELETE(request, { params }) {
  const { id, registrationId } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  await prisma.$transaction([
    prisma.conferenceAttendance.deleteMany({
      where: { conferenceId: id, userId: registration.userId },
    }),
    prisma.conferenceFeedback.deleteMany({
      where: { conferenceId: id, userId: registration.userId },
    }),
    prisma.conferenceCertificate.deleteMany({
      where: { conferenceId: id, userId: registration.userId },
    }),
    prisma.conferenceAccessKey.deleteMany({
      where: {
        conferenceId: id,
        OR: [{ userId: registration.userId }, { email }],
      },
    }),
    prisma.userRole.deleteMany({
      where: {
        userId: registration.userId,
        conferenceId: id,
        role: "ATTENDEE",
      },
    }),
    prisma.conferenceRegistration.delete({
      where: { id: registration.id },
    }),
  ]);

  await logActivity({
    session,
    request,
    action: ACTIVITY_ACTIONS.REGISTRATION_DELETE,
    description: `Removed registration for ${email}`,
    resourceType: "registration",
    resourceId: registration.id,
    conferenceId: id,
  });

  return NextResponse.json({
    ok: true,
    message: "Registration removed from this conference.",
  });
}
