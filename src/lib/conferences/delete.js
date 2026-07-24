import { prisma } from "@/lib/prisma";
import {
  deleteUserAndRelatedData,
  isOrphanAttendeeOnly,
} from "@/lib/users/orphan-attendee";

/**
 * Preview what conference deletion will remove.
 * @param {string} conferenceId
 */
export async function getConferenceDeleteImpact(conferenceId) {
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { id: true, title: true, slug: true },
  });
  if (!conference) return null;

  const [
    registrationCount,
    attendanceCount,
    feedbackCount,
    certificateCount,
    submissionCount,
    resourceCount,
    presentationCount,
    accessKeyCount,
    giftIssuanceCount,
    adminRoleCount,
    registrations,
  ] = await Promise.all([
    prisma.conferenceRegistration.count({ where: { conferenceId } }),
    prisma.conferenceAttendance.count({ where: { conferenceId } }),
    prisma.conferenceFeedback.count({ where: { conferenceId } }),
    prisma.conferenceCertificate.count({ where: { conferenceId } }),
    prisma.paperSubmission.count({ where: { conferenceId } }),
    prisma.conferenceResource.count({ where: { conferenceId } }),
    prisma.conferencePresentation.count({ where: { conferenceId } }),
    prisma.conferenceAccessKey.count({ where: { conferenceId } }),
    prisma.conferenceGiftIssuance.count({ where: { conferenceId } }),
    prisma.userRole.count({
      where: {
        conferenceId,
        role: { in: ["CONFERENCE_ADMIN", "REVIEWER"] },
      },
    }),
    prisma.conferenceRegistration.findMany({
      where: { conferenceId },
      select: { userId: true },
    }),
  ]);

  const uniqueUserIds = [...new Set(registrations.map((r) => r.userId))];
  let orphanAttendeeCount = 0;
  for (const userId of uniqueUserIds) {
    if (
      await isOrphanAttendeeOnly(userId, {
        excludingConferenceIds: [conferenceId],
      })
    ) {
      orphanAttendeeCount += 1;
    }
  }

  return {
    conference,
    registrationCount,
    attendanceCount,
    feedbackCount,
    certificateCount,
    submissionCount,
    resourceCount,
    presentationCount,
    accessKeyCount,
    giftIssuanceCount,
    adminRoleCount,
    orphanAttendeeCount,
    sharedAttendeeCount: Math.max(0, uniqueUserIds.length - orphanAttendeeCount),
  };
}

/**
 * Delete a conference and all related data. Attendees who only belong to this
 * conference (no other registrations, no staff roles) are also deleted.
 *
 * @param {string} conferenceId
 */
export async function deleteConferenceWithCascade(conferenceId) {
  const impact = await getConferenceDeleteImpact(conferenceId);
  if (!impact) {
    throw new Error("Conference not found.");
  }

  const registrationRows = await prisma.conferenceRegistration.findMany({
    where: { conferenceId },
    select: {
      userId: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });

  const seenUserIds = new Set();
  /** @type {Array<{ id: string; email: string; name: string | null }>} */
  const orphanUsers = [];
  for (const row of registrationRows) {
    if (seenUserIds.has(row.userId)) continue;
    seenUserIds.add(row.userId);
    if (
      await isOrphanAttendeeOnly(row.userId, {
        excludingConferenceIds: [conferenceId],
      })
    ) {
      orphanUsers.push({
        id: row.user.id,
        email: row.user.email,
        name: row.user.name,
      });
    }
  }

  // Conference delete cascades registrations, attendance, feedback, certificates,
  // papers, resources, presentations, gifts, access keys, and conference-scoped roles.
  await prisma.conference.delete({ where: { id: conferenceId } });

  for (const orphan of orphanUsers) {
    const stillExists = await prisma.user.findUnique({
      where: { id: orphan.id },
      select: { id: true },
    });
    if (stillExists) {
      await deleteUserAndRelatedData(orphan.id);
    }
  }

  return {
    ok: true,
    title: impact.conference.title,
    deletedOrphanAttendees: orphanUsers.length,
    orphanUsers,
    impact,
    message: buildDeleteSuccessMessage(impact, orphanUsers.length),
  };
}

/**
 * @param {Awaited<ReturnType<typeof getConferenceDeleteImpact>>} impact
 * @param {number} deletedOrphans
 */
function buildDeleteSuccessMessage(impact, deletedOrphans) {
  const parts = [
    `Conference "${impact.conference.title}" deleted.`,
    "All related conference data was removed.",
  ];
  if (deletedOrphans > 0) {
    parts.push(
      `${deletedOrphans} attendee account${deletedOrphans === 1 ? "" : "s"} that belonged only to this conference ${deletedOrphans === 1 ? "was" : "were"} also deleted.`,
    );
  }
  if (impact.sharedAttendeeCount > 0) {
    parts.push(
      `${impact.sharedAttendeeCount} attendee${impact.sharedAttendeeCount === 1 ? "" : "s"} kept because they belong to other conferences or hold staff roles.`,
    );
  }
  return parts.join(" ");
}
