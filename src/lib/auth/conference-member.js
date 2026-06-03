import { prisma } from "@/lib/prisma";
import { canManageConference } from "@/lib/auth/conference-access";

/**
 * Approved (CONFIRMED) registration required for conference member content.
 * @param {string} userId
 * @param {string} conferenceId
 */
export async function requireConfirmedRegistration(userId, conferenceId) {
  const registration = await prisma.conferenceRegistration.findUnique({
    where: { conferenceId_userId: { conferenceId, userId } },
    select: { status: true },
  });
  if (!registration) {
    return { ok: false, status: 403, error: "You are not registered for this conference." };
  }
  if (registration.status !== "CONFIRMED") {
    return {
      ok: false,
      status: 403,
      error: "This content is available after your registration is approved.",
    };
  }
  return { ok: true, registration };
}

/**
 * @param {import("@/lib/auth/session").SessionRecord | null} session
 * @param {string} conferenceId
 */
export async function canAccessConferenceMemberContent(session, conferenceId) {
  if (!session) return false;
  if (canManageConference(session, conferenceId)) return true;
  const check = await requireConfirmedRegistration(session.user.id, conferenceId);
  return check.ok;
}
