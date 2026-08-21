import { prisma } from "@/lib/prisma";

const STAFF_ROLES = ["SUPERADMIN", "CONFERENCE_ADMIN", "REVIEWER"];

/**
 * True when the user only exists as an attendee for the given conference(s)
 * and has no staff roles, no other registrations, and did not create conferences.
 *
 * @param {string} userId
 * @param {{ excludingConferenceIds?: string[] }} [opts]
 * After excluding those conferences, the user must have zero remaining registrations.
 */
export async function isOrphanAttendeeOnly(userId, opts = {}) {
  const excluding = Array.isArray(opts.excludingConferenceIds)
    ? opts.excludingConferenceIds.filter(Boolean)
    : [];

  const [staffRoleCount, otherRegistrationCount, createdConferenceCount] = await Promise.all([
    prisma.userRole.count({
      where: {
        userId,
        role: { in: STAFF_ROLES },
      },
    }),
    prisma.conferenceRegistration.count({
      where: {
        userId,
        ...(excluding.length > 0 ? { conferenceId: { notIn: excluding } } : {}),
      },
    }),
    prisma.conference.count({
      where: { createdById: userId },
    }),
  ]);

  return staffRoleCount === 0 && otherRegistrationCount === 0 && createdConferenceCount === 0;
}

/**
 * Delete a user and wipe relations that use SetNull so no orphaned rows remain.
 * Cascades handle registrations, attendance, feedback, certificates, roles, sessions, papers.
 *
 * @param {string} userId
 */
export async function deleteUserAndRelatedData(userId) {
  await prisma.$transaction([
    prisma.conferenceAccessKey.deleteMany({ where: { userId } }),
    prisma.conferenceGiftIssuance.deleteMany({ where: { userId } }),
    prisma.conferenceTourRegistration.deleteMany({ where: { userId } }),
    prisma.paperSubmission.updateMany({
      where: { assignedReviewerId: userId },
      data: { assignedReviewerId: null },
    }),
    prisma.conference.updateMany({
      where: { createdById: userId },
      data: { createdById: null },
    }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}

/**
 * After removing a registration from a conference, delete the user if they
 * no longer belong to any other conference and are not staff.
 *
 * @param {string} userId
 * @param {string} conferenceId - conference just removed from
 * @returns {Promise<boolean>} whether the user account was deleted
 */
export async function deleteUserIfOrphanAttendee(userId, conferenceId) {
  const giftCount = await prisma.conferenceGiftIssuance.count({
    where: { userId },
  });
  if (giftCount > 0) return false;

  const tourCount = await prisma.conferenceTourRegistration.count({
    where: { userId },
  });
  if (tourCount > 0) return false;

  const orphan = await isOrphanAttendeeOnly(userId, {
    excludingConferenceIds: [conferenceId],
  });
  if (!orphan) return false;
  await deleteUserAndRelatedData(userId);
  return true;
}
