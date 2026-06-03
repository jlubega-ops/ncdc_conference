import { prisma } from "@/lib/prisma";
import { DEFAULT_PAID_VISIBILITY } from "@/lib/conferences/constants";

/**
 * @param {unknown} raw
 */
export function normalizePaidContentVisibility(raw) {
  const base = { ...DEFAULT_PAID_VISIBILITY };
  if (!raw || typeof raw !== "object") return base;
  return {
    viewProgramme: raw.viewProgramme !== false,
    viewSpeakers: raw.viewSpeakers !== false,
    viewOnlineLinks: Boolean(raw.viewOnlineLinks),
  };
}

/**
 * @param {string} userId
 * @param {string} conferenceId
 */
export async function getUserConferenceRegistration(userId, conferenceId) {
  if (!userId || !conferenceId) return null;
  return prisma.conferenceRegistration.findUnique({
    where: {
      conferenceId_userId: { conferenceId, userId },
    },
    include: {
      conference: { select: { id: true, slug: true, title: true } },
    },
  });
}

/**
 * Programme and online links require approved registration when payment is required.
 * @param {any} conference
 * @param {"viewProgramme"|"viewSpeakers"|"viewOnlineLinks"} key
 * @param {string | null | undefined} registrationStatus
 */
export function canViewConferenceContent(conference, key, registrationStatus) {
  const approved = registrationStatus === "CONFIRMED";
  const restrictedUntilApproved = key === "viewProgramme" || key === "viewOnlineLinks";

  if (restrictedUntilApproved && !approved) {
    return false;
  }

  if (!conference?.requiresPayment) {
    return true;
  }

  const visibility = normalizePaidContentVisibility(conference.paidContentVisibility);
  return Boolean(visibility[key]);
}
