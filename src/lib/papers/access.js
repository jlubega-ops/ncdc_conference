import { prisma } from "@/lib/prisma";
import { isCfpOpen } from "@/lib/conferences/registrable";
import { getPublishedConferenceBySlugCached } from "@/lib/conferences/public-cache";
import { canManageConference } from "@/lib/auth/conference-access";

/**
 * @param {string} userId
 * @param {string} conferenceId
 */
export async function requireApprovedRegistration(userId, conferenceId) {
  const registration = await prisma.conferenceRegistration.findUnique({
    where: {
      conferenceId_userId: { conferenceId, userId },
    },
  });
  if (!registration) {
    return { ok: false, error: "You must register for this conference before submitting a paper." };
  }
  if (registration.status !== "CONFIRMED") {
    return {
      ok: false,
      error: "Paper submission is only available after your registration is approved.",
    };
  }
  return { ok: true, registration };
}

/**
 * @param {string} slug
 */
export async function getConferenceContextForPapers(slug) {
  const conference = await getPublishedConferenceBySlugCached(slug);
  if (!conference) return null;
  return { conference, cfpOpen: isCfpOpen(conference) };
}

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 * @param {string} conferenceId
 * @param {string} submissionId
 */
export async function canReviewPaperSubmission(session, conferenceId, submissionId) {
  if (!session) return false;
  if (session.activeRole === "SUPERADMIN") return true;
  if (
    session.activeRole === "CONFERENCE_ADMIN" &&
    canManageConference(session, conferenceId)
  ) {
    return true;
  }
  if (session.activeRole === "REVIEWER") {
    const row = await prisma.paperSubmission.findFirst({
      where: {
        id: submissionId,
        conferenceId,
        assignedReviewerId: session.user.id,
      },
      select: { id: true },
    });
    return Boolean(row);
  }
  return false;
}
