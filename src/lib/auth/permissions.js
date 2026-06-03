import { ROLE_HIERARCHY } from "@/lib/auth/roles";

/** Permission keys used for nav / sidebar visibility */
export const PERMISSIONS = {
  DASHBOARD: "dashboard",
  PROFILE: "profile",
  USERS: "users",
  ALL_CONFERENCES: "all_conferences",
  MANAGE_CONFERENCE: "manage_conference",
  SUBMISSIONS: "submissions",
  MY_SUBMISSIONS: "my_submissions",
  REVIEW_QUEUE: "review_queue",
  REGISTRATIONS: "registrations",
  MY_REGISTRATIONS: "my_registrations",
  REPORTS: "reports",
  ACCESS_KEYS: "access_keys",
};

const ROLE_PERMISSIONS = {
  SUPERADMIN: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.PROFILE,
    PERMISSIONS.USERS,
    PERMISSIONS.ALL_CONFERENCES,
    PERMISSIONS.MANAGE_CONFERENCE,
    PERMISSIONS.SUBMISSIONS,
    PERMISSIONS.REVIEW_QUEUE,
    PERMISSIONS.REGISTRATIONS,
    PERMISSIONS.REPORTS,
    PERMISSIONS.ACCESS_KEYS,
  ],
  CONFERENCE_ADMIN: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.PROFILE,
    PERMISSIONS.MANAGE_CONFERENCE,
    PERMISSIONS.SUBMISSIONS,
    PERMISSIONS.REVIEW_QUEUE,
    PERMISSIONS.REGISTRATIONS,
    PERMISSIONS.REPORTS,
    PERMISSIONS.ACCESS_KEYS,
  ],
  REVIEWER: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.PROFILE,
    PERMISSIONS.REVIEW_QUEUE,
  ],
  ATTENDEE: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.PROFILE,
    PERMISSIONS.MY_REGISTRATIONS,
  ],
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
    label: "Conferences",
    href: "/dashboard/conferences",
    permission: PERMISSIONS.ALL_CONFERENCES,
    icon: "Calendar",
  },
  {
    label: "Manage Conference",
    href: "/dashboard/manage",
    permission: PERMISSIONS.MANAGE_CONFERENCE,
    icon: "Settings",
  },
  {
    label: "Submissions",
    href: "/dashboard/submissions",
    permission: PERMISSIONS.SUBMISSIONS,
    icon: "FileText",
  },
  {
    label: "My Submissions",
    href: "/dashboard/my-submissions",
    permission: PERMISSIONS.MY_SUBMISSIONS,
    icon: "FileText",
  },
  {
    label: "Review Queue",
    href: "/dashboard/reviews",
    permission: PERMISSIONS.REVIEW_QUEUE,
    icon: "ClipboardCheck",
  },
  {
    label: "Registrations",
    href: "/dashboard/registrations",
    permission: PERMISSIONS.REGISTRATIONS,
    icon: "UserPlus",
  },
  {
    label: "My Registrations",
    href: "/dashboard/my-registrations",
    permission: PERMISSIONS.MY_REGISTRATIONS,
    icon: "Ticket",
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    permission: PERMISSIONS.REPORTS,
    icon: "BarChart3",
  },
  {
    label: "Access Keys",
    href: "/dashboard/access-keys",
    permission: PERMISSIONS.ACCESS_KEYS,
    icon: "Key",
  },
];

/**
 * @param {string} activeRole
 */
export function getNavForRole(activeRole) {
  return DASHBOARD_NAV.filter((item) => hasPermission(activeRole, item.permission));
}

export { ROLE_HIERARCHY };
