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

/**
 * API role check with distinct 401 (signed out) vs 403 (wrong role).
 * @param {string[]} allowedRoles
 * @returns {Promise<{ ok: true, session: any } | { ok: false, status: 401|403, error: string, session: null }>}
 */
export async function authorizeRoles(allowedRoles) {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, status: 401, error: "Sign in required.", session: null };
  }
  if (!allowedRoles.includes(session.activeRole)) {
    return {
      ok: false,
      status: 403,
      error: "You do not have permission for this action.",
      session: null,
    };
  }
  return { ok: true, session };
}

export async function authorizeSuperadmin() {
  return authorizeRoles(["SUPERADMIN"]);
}

export async function authorizeConferenceManager() {
  return authorizeRoles(["SUPERADMIN", "CONFERENCE_ADMIN"]);
}

export async function authorizeReviewer() {
  return authorizeRoles(["REVIEWER"]);
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
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}&reason=session_expired`);
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
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}&reason=session_expired`);
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
 * Conference-scoped API access with distinct 401 vs 403.
 * @param {string} conferenceId
 * @returns {Promise<{ ok: true, session: any } | { ok: false, status: 401|403, error: string, session?: null }>}
 */
export async function authorizeConferenceAccess(conferenceId) {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, status: 401, error: "Unauthorized", session: null };
  }
  if (!["SUPERADMIN", "CONFERENCE_ADMIN"].includes(session.activeRole)) {
    return { ok: false, status: 403, error: "Forbidden", session: null };
  }
  if (!canManageConference(session, conferenceId)) {
    return { ok: false, status: 403, error: "Forbidden", session: null };
  }
  return { ok: true, session };
}

/**
 * @param {string} conferenceId
 * @returns {Promise<any | null>}
 */
export async function requireConferenceAccess(conferenceId) {
  const result = await authorizeConferenceAccess(conferenceId);
  return result.ok ? result.session : null;
}

export async function requireSuperadmin() {
  return requireRoles(["SUPERADMIN"]);
}

/** Any account with SUPERADMIN role (even if active role is different). */
export async function requireSuperadminCapability() {
  const result = await authorizeSuperadminCapability();
  return result.ok ? result.session : null;
}

export async function authorizeSuperadminCapability() {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, status: 401, error: "Sign in required.", session: null };
  }
  if (!isSuperadminUser(session)) {
    return {
      ok: false,
      status: 403,
      error: "You do not have permission for this action.",
      session: null,
    };
  }
  return { ok: true, session };
}

/**
 * @param {string} returnPath
 */
export async function requireSuperadminPage(returnPath) {
  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}&reason=session_expired`);
  }
  if (session.activeRole !== "SUPERADMIN") {
    redirect(getDefaultDashboardPath(session));
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
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}&reason=session_expired`);
  }
  if (!hasPermission(session.activeRole, permission)) {
    redirect(getDefaultDashboardPath(session));
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
  const result = await authorizePaperReviewAccess(conferenceId, submissionId);
  return result.ok ? result.session : null;
}

/**
 * @param {string} conferenceId
 * @param {string} submissionId
 */
export async function authorizePaperReviewAccess(conferenceId, submissionId) {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, status: 401, error: "Sign in required.", session: null };
  }
  const allowed = await canReviewPaperSubmission(session, conferenceId, submissionId);
  if (!allowed) {
    return { ok: false, status: 403, error: "Forbidden", session: null };
  }
  return { ok: true, session };
}
