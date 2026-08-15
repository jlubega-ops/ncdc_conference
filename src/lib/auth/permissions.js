import { ROLE_HIERARCHY } from "@/lib/auth/roles";

/** Permission keys used for nav / sidebar visibility */
export const PERMISSIONS = {
  DASHBOARD: "dashboard",
  PROFILE: "profile",
  USERS: "users",
  MANAGE_CONFERENCE: "manage_conference",
  SUBMISSIONS: "submissions",
  MY_SUBMISSIONS: "my_submissions",
  MY_PAPERS: "my_papers",
  SUBMIT_PAPER: "submit_paper",
  MY_PROGRAMME: "my_programme",
  MY_MATERIALS: "my_materials",
  MY_ATTENDANCE: "my_attendance",
  MY_CERTIFICATES: "my_certificates",
  REVIEW_QUEUE: "review_queue",
  REVIEWER_PAPERS: "reviewer_papers",
  REGISTRATIONS: "registrations",
  MY_REGISTRATIONS: "my_registrations",
  REPORTS: "reports",
  ACTIVITY_LOG: "activity_log",
};

const ROLE_PERMISSIONS = {
  SUPERADMIN: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.PROFILE,
    PERMISSIONS.USERS,
    PERMISSIONS.MANAGE_CONFERENCE,
    PERMISSIONS.SUBMISSIONS,
    PERMISSIONS.REVIEW_QUEUE,
    PERMISSIONS.REGISTRATIONS,
    PERMISSIONS.REPORTS,
    PERMISSIONS.ACTIVITY_LOG,
  ],
  CONFERENCE_ADMIN: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.PROFILE,
    PERMISSIONS.MANAGE_CONFERENCE,
    PERMISSIONS.SUBMISSIONS,
    PERMISSIONS.REVIEW_QUEUE,
    PERMISSIONS.REGISTRATIONS,
    PERMISSIONS.REPORTS,
  ],
  REVIEWER: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.PROFILE,
    PERMISSIONS.REVIEW_QUEUE,
    PERMISSIONS.REVIEWER_PAPERS,
    PERMISSIONS.REPORTS,
  ],
  // Attendees live entirely on their conference tabs (`/conferences/{slug}`) —
  // no dashboard sidebar, no my-registrations/attendance/certificates pages.
  ATTENDEE: [PERMISSIONS.PROFILE],
};

/**
 * @param {string} activeRole
 * @param {string} permission
 */
export function hasPermission(activeRole, permission) {
  const allowed = ROLE_PERMISSIONS[activeRole] ?? [];
  return allowed.includes(permission);
}

/**
 * @param {string} activeRole
 */
export function getPermissionsForRole(activeRole) {
  return ROLE_PERMISSIONS[activeRole] ?? [];
}

/**
 * Dashboard sidebar / nav items (post-login, role-filtered)
 */
export const DASHBOARD_NAV = [
  {
    label: "Overview",
    href: "/dashboard",
    permission: PERMISSIONS.DASHBOARD,
    icon: "LayoutDashboard",
  },
  {
    label: "Users",
    href: "/dashboard/users",
    permission: PERMISSIONS.USERS,
    icon: "Users",
  },
  {
    label: "Activity log",
    href: "/dashboard/activity-log",
    permission: PERMISSIONS.ACTIVITY_LOG,
    icon: "ScrollText",
  },
  {
    label: "Manage Conference",
    href: "/dashboard/manage",
    permission: PERMISSIONS.MANAGE_CONFERENCE,
    icon: "Settings",
  },
  {
    label: "Paper submissions",
    href: "/dashboard/submissions",
    permission: PERMISSIONS.SUBMISSIONS,
    icon: "FileText",
  },
  {
    label: "Evaluations & comments",
    href: "/dashboard/reviews",
    permission: PERMISSIONS.REVIEW_QUEUE,
    icon: "ClipboardCheck",
  },
  {
    label: "Assigned papers",
    href: "/dashboard/reviewer/papers",
    permission: PERMISSIONS.REVIEWER_PAPERS,
    icon: "FileText",
  },
  {
    label: "Registrations",
    href: "/dashboard/registrations",
    permission: PERMISSIONS.REGISTRATIONS,
    icon: "UserPlus",
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    permission: PERMISSIONS.REPORTS,
    icon: "BarChart3",
  },
];

/**
 * @param {string} activeRole
 */
export function getNavForRole(activeRole) {
  return DASHBOARD_NAV.filter((item) => hasPermission(activeRole, item.permission));
}

export { ROLE_HIERARCHY };
