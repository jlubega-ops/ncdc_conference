/** Staff (superadmin / conference admin / reviewer): logout after this much inactivity. */
export const STAFF_IDLE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Attendee access session: absolute lifetime from sign-in (not idle-based). */
export const ATTENDEE_SESSION_TTL_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

/**
 * @param {string} role
 * @param {string[]} staffRoles
 */
export function getSessionTtlMsForRole(role, staffRoles) {
  if (role === "ATTENDEE") return ATTENDEE_SESSION_TTL_MS;
  if (staffRoles.includes(role)) return STAFF_IDLE_TTL_MS;
  return STAFF_IDLE_TTL_MS;
}
