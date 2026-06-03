import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getDistinctRolesForSwitch, getHighestRole } from "@/lib/auth/roles";
import { getPermissionsForRole } from "@/lib/auth/permissions";

export const SESSION_COOKIE = "ncdc_session";
const SESSION_DAYS = 7;

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

function sessionExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

/**
 * @param {import("next/server").NextResponse} response
 */
export async function setSessionCookie(response, token) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
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
 */
export async function createUserSession(userId, activeRole, request) {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.session.create({
      data: {
        userId,
        tokenHash,
        activeRole,
        expiresAt: sessionExpiry(),
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
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session;
}

/**
 * Build client-safe session payload
 */
export async function getCurrentSession() {
  const record = await getSessionRecord();
  if (!record) return null;

  const { user, activeRole } = record;
  const roleNames = user.roles.map((r) => r.role);
  const availableRoles = getDistinctRolesForSwitch(user.roles);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
    activeRole,
    availableRoles,
    canSwitchRole: availableRoles.length > 1,
    permissions: getPermissionsForRole(activeRole),
    roles: user.roles.map((r) => ({
      role: r.role,
      conferenceId: r.conferenceId,
      conference: r.conference,
    })),
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
    data: { activeRole: newRole },
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
