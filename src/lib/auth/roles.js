/** Highest privilege first — used to pick active role on login */
export const ROLE_HIERARCHY = [
  "SUPERADMIN",
  "CONFERENCE_ADMIN",
  "REVIEWER",
  "ATTENDEE",
];

export const ROLE_LABELS = {
  SUPERADMIN: "Super Admin",
  CONFERENCE_ADMIN: "Conference Admin",
  REVIEWER: "Reviewer",
  ATTENDEE: "Attendee",
};

/** Staff roles that use email + password */
export const STAFF_ROLES = ["SUPERADMIN", "CONFERENCE_ADMIN", "REVIEWER"];

/**
 * @param {string[]} roles - distinct role names
 * @returns {string} highest role
 */
export function getHighestRole(roles) {
  for (const role of ROLE_HIERARCHY) {
    if (roles.includes(role)) return role;
  }
  return roles[0] ?? "ATTENDEE";
}

/**
 * @param {Array<{ role: string, conferenceId?: string | null }>} userRoles
 * @returns {string[]} distinct global role names for switching
 */
export function getDistinctRolesForSwitch(userRoles) {
  const global = new Set();
  for (const ur of userRoles) {
    global.add(ur.role);
  }
  return ROLE_HIERARCHY.filter((r) => global.has(r));
}

/**
 * @param {string} role
 * @param {string | null | undefined} conferenceId
 */
export function formatRoleAssignment(role, conferenceId) {
  const label = ROLE_LABELS[role] ?? role;
  if (conferenceId && role !== "SUPERADMIN") {
    return `${label} (conference-scoped)`;
  }
  return label;
}
