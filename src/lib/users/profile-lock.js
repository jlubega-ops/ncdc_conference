import { prisma } from "@/lib/prisma";

/**
 * Attendees of admin-upload conferences cannot change name/profile themselves.
 * @param {string} userId
 * @param {string | null} [activeConferenceId]
 */
export async function isAttendeeProfileLocked(userId, activeConferenceId = null) {
  if (activeConferenceId) {
    const conference = await prisma.conference.findUnique({
      where: { id: activeConferenceId },
      select: { registrationMode: true },
    });
    return conference?.registrationMode === "ADMIN_UPLOAD";
  }

  const hit = await prisma.conferenceRegistration.findFirst({
    where: {
      userId,
      status: { in: ["CONFIRMED", "PENDING"] },
      conference: { registrationMode: "ADMIN_UPLOAD" },
    },
    select: { id: true },
  });
  return Boolean(hit);
}
