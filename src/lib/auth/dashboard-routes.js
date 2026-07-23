/**
 * @param {{ activeConferenceId?: string | null, roles?: Array<{ conferenceId?: string | null, conference?: { slug?: string | null } | null }> } | null | undefined} session
 */
export function getActiveConferenceSlug(session) {
  if (!session?.activeConferenceId || !Array.isArray(session.roles)) return null;
  const match = session.roles.find(
    (r) => r.conferenceId === session.activeConferenceId && r.conference?.slug,
  );
  return match?.conference?.slug ?? null;
}

/**
 * Default dashboard landing path after login or role switch.
 * Accepts either the active role string or the full session object (preferred,
 * needed to resolve an attendee's conference slug).
 * @param {string | { activeRole?: string } | null | undefined} sessionOrRole
 */
export function getDefaultDashboardPath(sessionOrRole) {
  const session = typeof sessionOrRole === "string" ? null : sessionOrRole;
  const activeRole = typeof sessionOrRole === "string" ? sessionOrRole : sessionOrRole?.activeRole;

  switch (activeRole) {
    case "REVIEWER":
      return "/dashboard/reviewer/papers";
    case "ATTENDEE": {
      const slug = getActiveConferenceSlug(session);
      return slug ? `/conferences/${slug}` : "/login?mode=access";
    }
    case "SUPERADMIN":
    case "CONFERENCE_ADMIN":
    default:
      return "/dashboard";
  }
}
