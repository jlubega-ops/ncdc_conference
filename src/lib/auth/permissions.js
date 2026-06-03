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
  ACCESS_KEYS: "access_keys",
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
    PERMISSIONS.REVIEWER_PAPERS,
    PERMISSIONS.REPORTS,
  ],
  ATTENDEE: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.PROFILE,
    PERMISSIONS.MY_REGISTRATIONS,
    PERMISSIONS.SUBMIT_PAPER,
    PERMISSIONS.MY_PAPERS,
    PERMISSIONS.MY_PROGRAMME,
    PERMISSIONS.MY_MATERIALS,
    PERMISSIONS.MY_ATTENDANCE,
    PERMISSIONS.MY_CERTIFICATES,
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
    label: "Submit paper",
    href: "/dashboard/submit-paper",
    permission: PERMISSIONS.SUBMIT_PAPER,
    icon: "FilePlus",
  },
  {
    label: "My papers",
    href: "/dashboard/my-papers",
    permission: PERMISSIONS.MY_PAPERS,
    icon: "Files",
  },
  {
    label: "Programme",
    href: "/dashboard/programme",
    permission: PERMISSIONS.MY_PROGRAMME,
    icon: "CalendarDays",
  },
  {
    label: "Conference materials",
    href: "/dashboard/materials",
    permission: PERMISSIONS.MY_MATERIALS,
    icon: "BookOpen",
  },
  {
    label: "Attendance",
    href: "/dashboard/attendance",
    permission: PERMISSIONS.MY_ATTENDANCE,
    icon: "UserCheck",
  },
  {
    label: "Certificates",
    href: "/dashboard/certificates",
    permission: PERMISSIONS.MY_CERTIFICATES,
    icon: "Award",
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
];

/**
 * @param {string} activeRole
 */
export function getNavForRole(activeRole) {
  return DASHBOARD_NAV.filter((item) => hasPermission(activeRole, item.permission));
}

export { ROLE_HIERARCHY };
