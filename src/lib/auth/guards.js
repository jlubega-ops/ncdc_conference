import { getCurrentSession } from "@/lib/auth/session";
import { canManageConference } from "@/lib/auth/conference-access";

/**
 * @param {string[]} allowedRoles
 */
export async function requireRoles(allowedRoles) {
  const session = await getCurrentSession();
  if (!session) return null;
  if (!allowedRoles.includes(session.activeRole)) return null;
  return session;
}

export async function requireConferenceManager() {
  return requireRoles(["SUPERADMIN", "CONFERENCE_ADMIN"]);
}

/**
 * @param {string} conferenceId
 */
export async function requireConferenceAccess(conferenceId) {
  const session = await requireConferenceManager();
  if (!session) return null;
  if (!canManageConference(session, conferenceId)) return null;
  return session;
}

export async function requireSuperadmin() {
  return requireRoles(["SUPERADMIN"]);
}
