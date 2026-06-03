/**
 * Conference-scoped access for CONFERENCE_ADMIN vs SUPERADMIN.
 */

/**
 * @param {import("@/lib/auth/session").getCurrentSession extends () => Promise<infer S>} session
 * @param {string} conferenceId
 */
export function canManageConference(session, conferenceId) {
  if (!session) return false;
  if (session.activeRole === "SUPERADMIN") return true;
  if (session.activeRole !== "CONFERENCE_ADMIN") return false;
  return session.roles.some(
    (r) => r.role === "CONFERENCE_ADMIN" && r.conferenceId === conferenceId,
  );
}

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 */
export function getManagedConferenceIds(session) {
  if (!session) return [];
  if (session.activeRole === "SUPERADMIN") return null;
  if (session.activeRole !== "CONFERENCE_ADMIN") return [];
  return session.roles
    .filter((r) => r.role === "CONFERENCE_ADMIN" && r.conferenceId)
    .map((r) => r.conferenceId);
}

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 */
export function canAssignConferenceAdmins(session) {
  return session?.activeRole === "SUPERADMIN";
}
