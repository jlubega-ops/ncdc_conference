import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { mapConferenceForUi } from "@/lib/conferences/service";
import { mapRegistrationForAdmin, userSelect } from "@/lib/conferences/admin-data";
import { issueAndEmailAccessKey } from "@/lib/registration/access-key-issue";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const { id: conferenceId, registrationId } = await params;
  const session = await requireConferenceAccess(conferenceId);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const registration = await prisma.conferenceRegistration.findFirst({
    where: { id: registrationId, conferenceId },
    include: {
      user: { select: userSelect },
      conference: true,
    },
  });

  if (!registration) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  if (registration.status === "CONFIRMED") {
    return NextResponse.json(
      { error: "This registration is already activated." },
      { status: 400 },
    );
  }

  const mapped = mapConferenceForUi(registration.conference);

  await prisma.conferenceRegistration.update({
    where: { id: registrationId },
    data: {
      status: "CONFIRMED",
      paymentStatus: mapped.requiresPayment ? "verified" : null,
    },
  });

  const hasAttendee = await prisma.userRole.findFirst({
    where: {
      userId: registration.userId,
      role: "ATTENDEE",
      conferenceId,
    },
  });
  if (!hasAttendee) {
    await prisma.userRole.create({
      data: {
        userId: registration.userId,
        role: "ATTENDEE",
        conferenceId,
      },
    });
  }

  const keyResult = await issueAndEmailAccessKey({
    user: registration.user,
    conference: registration.conference,
  });

  const updated = await prisma.conferenceRegistration.findUnique({
    where: { id: registrationId },
    include: { user: { select: userSelect } },
  });

  await logActivity({
    session,
    request,
    action: ACTIVITY_ACTIONS.REGISTRATION_ACTIVATE,
    description: `Activated registration for ${registration.user.email}`,
    resourceType: "registration",
    resourceId: registrationId,
    conferenceId,
    metadata: { emailSent: keyResult.emailSent },
  });

  return NextResponse.json({
    ok: true,
    message: keyResult.emailSent
      ? "Registration activated. Access key emailed to the attendee."
      : "Registration activated, but the access key email could not be sent. Use Resend access code.",
    registration: mapRegistrationForAdmin(updated, { hasAccessKey: true }),
  });
}
