import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getDistinctRolesForSwitch, getHighestRole, STAFF_ROLES } from "@/lib/auth/roles";
import { getPermissionsForRole } from "@/lib/auth/permissions";
import { getProfileFromUser } from "@/lib/users/profile";

export const SESSION_COOKIE = "ncdc_session";

/** Staff (superadmin / conference admin / reviewer): idle timeout */
export const STAFF_IDLE_TTL_MS = 60 * 60 * 1000; // 1 hour
/** Attendee access session: idle timeout */
export const ATTENDEE_IDLE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
/** Skip DB touch if expiry was extended this recently */
const SESSION_TOUCH_THROTTLE_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Idle TTL for the active role (sliding window — activity extends the session).
 * @param {string} role
 */
export function getSessionIdleTtlMs(role) {
  if (role === "ATTENDEE") return ATTENDEE_IDLE_TTL_MS;
  if (STAFF_ROLES.includes(role)) return STAFF_IDLE_TTL_MS;
  return STAFF_IDLE_TTL_MS;
}

/**
 * Cookie maxAge in seconds for a role (matches idle TTL).
 * @param {string} role
 */
export function getSessionCookieMaxAgeSeconds(role) {
  return Math.floor(getSessionIdleTtlMs(role) / 1000);
}

/**
 * @param {string} role
 */
export function sessionExpiryForRole(role) {
  return new Date(Date.now() + getSessionIdleTtlMs(role));
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set (min 32 characters) in production");
    }
    return "dev-only-session-secret-min-32-chars!!";
  }
  return secret;
}

export function generateSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token) {
  return createHash("sha256").update(`${token}:${getSessionSecret()}`).digest("hex");
}

/**
 * @param {import("next/server").NextResponse} response
 * @param {string} token
 * @param {string} [role]
 */
export async function setSessionCookie(response, token, role = "ATTENDEE") {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionCookieMaxAgeSeconds(role),
  });
}

export async function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * @param {string} userId
 * @param {string} activeRole
 * @param {import("next/server").NextRequest} [request]
 * @param {{ activeConferenceId?: string | null }} [opts]
 */
export async function createUserSession(userId, activeRole, request, opts = {}) {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.session.create({
      data: {
        userId,
        tokenHash,
        activeRole,
        activeConferenceId: opts.activeConferenceId ?? null,
        expiresAt: sessionExpiryForRole(activeRole),
        userAgent: request?.headers.get("user-agent") ?? undefined,
        ipAddress:
          request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request?.headers.get("x-real-ip") ??
          undefined,
      },
    }),
  ]);

  return token;
}

export async function getSessionTokenFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Extend session expiry on activity (throttled). Mutates session.expiresAt in memory when updated.
 * @param {{ id: string; activeRole: string; expiresAt: Date }} session
 */
async function touchSessionIfNeeded(session) {
  const ttlMs = getSessionIdleTtlMs(session.activeRole);
  const nextExpiry = new Date(Date.now() + ttlMs);
  const expiresAtMs = new Date(session.expiresAt).getTime();
  // Already near full idle window — skip write
  if (expiresAtMs >= nextExpiry.getTime() - SESSION_TOUCH_THROTTLE_MS) {
    return session;
  }

  try {
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: nextExpiry },
    });
    session.expiresAt = nextExpiry;
  } catch {
    /* session may have been deleted concurrently */
  }
  return session;
}

export async function getSessionRecord() {
  const token = await getSessionTokenFromCookie();
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          roles: {
            include: { conference: { select: { id: true, slug: true, title: true } } },
          },
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  await touchSessionIfNeeded(session);
  return session;
}

/**
 * Build client-safe session payload
 */
export async function getCurrentSession() {
  const record = await getSessionRecord();
  if (!record) return null;

  const { user, activeRole } = record;
  const availableRoles = getDistinctRolesForSwitch(user.roles);
  const profile = getProfileFromUser(user);
  const displayName = profile.fullName || user.name || user.email;
  const telephone = profile.telephone
    ? `${profile.countryCode || ""} ${profile.telephone}`.trim()
    : null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: displayName,
      image: user.image,
      telephone,
      mustChangePassword: user.mustChangePassword,
    },
    activeRole,
    activeConferenceId: record.activeConferenceId ?? null,
    availableRoles,
    canSwitchRole: availableRoles.length > 1,
    permissions: getPermissionsForRole(activeRole),
    roles: user.roles.map((r) => ({
      role: r.role,
      conferenceId: r.conferenceId,
      conference: r.conference,
    })),
    expiresAt: record.expiresAt?.toISOString?.() ?? null,
  };
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) return null;
  return session;
}

/**
 * @param {string} userId
 * @param {string} newRole
 */
export async function switchActiveRole(userId, newRole) {
  const token = await getSessionTokenFromCookie();
  if (!token) throw new Error("Not authenticated");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });

  if (!user) throw new Error("User not found");

  const hasRole = user.roles.some((r) => r.role === newRole);
  if (!hasRole) throw new Error("Role not assigned to user");

  const tokenHash = hashToken(token);
  await prisma.session.update({
    where: { tokenHash },
    data: {
      activeRole: newRole,
      expiresAt: sessionExpiryForRole(newRole),
    },
  });

  return getCurrentSession();
}

export async function destroySession() {
  const token = await getSessionTokenFromCookie();
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
}

export async function resolveLoginActiveRole(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  if (!user?.roles.length) return null;
  const roleNames = user.roles.map((r) => r.role);
  return getHighestRole(roleNames);
}
