import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { canManageConference, isSuperadminUser } from "@/lib/auth/conference-access";
import { hasPermission } from "@/lib/auth/permissions";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";
import { canReviewPaperSubmission } from "@/lib/papers/access";

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
 * Conference manager pages: send unauthenticated users to login, wrong role to dashboard.
 * @param {string} returnPath
 */
export async function requireConferenceManagerPage(returnPath) {
  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }
  if (!["SUPERADMIN", "CONFERENCE_ADMIN"].includes(session.activeRole)) {
    if (session.activeRole === "REVIEWER") {
      redirect("/dashboard/reviewer/papers");
    }
    redirect("/dashboard");
  }
  return session;
}

/**
 * @param {string} returnPath
 */
export async function requireReviewerPage(returnPath) {
  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }
  if (session.activeRole !== "REVIEWER") {
    if (["SUPERADMIN", "CONFERENCE_ADMIN"].includes(session.activeRole)) {
      redirect("/dashboard");
    }
    redirect("/dashboard/my-registrations");
  }
  return session;
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

/** Any account with SUPERADMIN role (even if active role is different). */
export async function requireSuperadminCapability() {
  const session = await getCurrentSession();
  if (!session) return null;
  if (!isSuperadminUser(session)) return null;
  return session;
}

/**
 * @param {string} returnPath
 */
export async function requireSuperadminPage(returnPath) {
  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }
  if (session.activeRole !== "SUPERADMIN") {
    redirect(getDefaultDashboardPath(session.activeRole));
  }
  return session;
}

/**
 * @param {string} permission
 * @param {string} returnPath
 */
export async function requirePermissionPage(permission, returnPath) {
  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }
  if (!hasPermission(session.activeRole, permission)) {
    redirect(getDefaultDashboardPath(session.activeRole));
  }
  return session;
}

export async function requireReviewer() {
  return requireRoles(["REVIEWER"]);
}

/**
 * @param {string} conferenceId
 * @param {string} submissionId
 */
export async function requirePaperReviewAccess(conferenceId, submissionId) {
  const session = await getCurrentSession();
  if (!session) return null;
  const allowed = await canReviewPaperSubmission(session, conferenceId, submissionId);
  if (!allowed) return null;
  return session;
}
