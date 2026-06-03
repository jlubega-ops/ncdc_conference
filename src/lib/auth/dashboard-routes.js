/** Default dashboard landing path after login or role switch */
export function getDefaultDashboardPath(activeRole) {
  switch (activeRole) {
    case "REVIEWER":
      return "/dashboard/reviewer/papers";
    case "ATTENDEE":
      return "/dashboard/my-registrations";
    case "SUPERADMIN":
    case "CONFERENCE_ADMIN":
    default:
      return "/dashboard";
  }
}
