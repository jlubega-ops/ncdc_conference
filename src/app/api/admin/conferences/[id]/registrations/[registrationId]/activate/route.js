import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { createConferenceAccessKeyRecord } from "@/lib/auth/access-key";
import { getConferenceYear } from "@/lib/conferences/registrable";
import { mapConferenceForUi } from "@/lib/conferences/service";
import { mapRegistrationForAdmin, userSelect } from "@/lib/conferences/admin-data";

export async function POST(_request, { params }) {
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
  const year = getConferenceYear(mapped);
  const email = registration.user.email;

  await prisma.conferenceAccessKey.updateMany({
    where: {
      conferenceId,
      email,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  const { displayKey } = await createConferenceAccessKeyRecord({
    conferenceId,
    email,
    year,
    userId: registration.userId,
  });

  await prisma.conferenceRegistration.update({
    where: { id: registrationId },
    data: { status: "CONFIRMED" },
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

  const updated = await prisma.conferenceRegistration.findUnique({
    where: { id: registrationId },
    include: { user: { select: userSelect } },
  });

  return NextResponse.json({
    ok: true,
    message: "Registration activated. Share the access key with the attendee.",
    accessKey: displayKey,
    registration: mapRegistrationForAdmin(updated),
  });
}
