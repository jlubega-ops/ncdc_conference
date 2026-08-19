import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateTemporaryPassword } from "@/lib/auth/credentials";
import { sendEmail } from "@/lib/email/mailer";
import { accountWelcomeEmail } from "@/lib/email/templates";
import { getProfileFromUser } from "@/lib/users/profile";
import { ROLE_LABELS } from "@/lib/auth/roles";

const STAFF_ROLES = ["SUPERADMIN", "CONFERENCE_ADMIN", "REVIEWER"];

const userSelect = {
  id: true,
  email: true,
  name: true,
  mustChangePassword: true,
  profileData: true,
  createdAt: true,
};

/**
 * @param {any} row
 * @param {string | null} currentUserId
 */
export function mapConferenceAdminRow(row, currentUserId = null) {
  const profile = getProfileFromUser(row.user);
  return {
    roleId: row.id,
    userId: row.user.id,
    email: row.user.email,
    name: row.user.name,
    displayName: profile.fullName || row.user.name || row.user.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    gender: profile.gender,
    assignedAt: row.createdAt,
    accountActivated: !row.user.mustChangePassword,
    isCurrentUser: currentUserId === row.user.id,
  };
}

/**
 * @param {string} conferenceId
 * @param {string | null} currentUserId
 */
export async function listConferenceAdmins(conferenceId, currentUserId = null) {
  const rows = await prisma.userRole.findMany({
    where: { conferenceId, role: "CONFERENCE_ADMIN" },
    include: { user: { select: userSelect } },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => mapConferenceAdminRow(row, currentUserId));
}

/**
 * @param {string} conferenceId
 * @param {string} query
 */
export async function searchConferenceAdminCandidates(conferenceId, query) {
  const q = query.trim();
  if (q.length < 2) return [];

  const assigned = await prisma.userRole.findMany({
    where: { conferenceId, role: "CONFERENCE_ADMIN" },
    select: { userId: true },
  });
  const assignedIds = new Set(assigned.map((a) => a.userId));

  const users = await prisma.user.findMany({
    where: {
      OR: [{ email: { contains: q } }, { name: { contains: q } }],
    },
    select: {
      ...userSelect,
      roles: {
        select: { role: true, conferenceId: true, conference: { select: { title: true } } },
      },
    },
    take: 12,
    orderBy: { email: "asc" },
  });

  return users.map((user) => {
    const profile = getProfileFromUser(user);
    const isSuperadmin = user.roles.some((r) => r.role === "SUPERADMIN");
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: profile.fullName || user.name || user.email,
      alreadyAssigned: assignedIds.has(user.id),
      isSuperadmin,
      accountActivated: !user.mustChangePassword,
      roles: user.roles.map((r) => ({
        role: r.role,
        label: ROLE_LABELS[r.role] ?? r.role,
        conferenceTitle: r.conference?.title ?? null,
      })),
    };
  });
}

/**
 * @param {string} conferenceId
 * @param {string} userId
 */
export async function assignConferenceAdmin(conferenceId, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  if (!user) throw new Error("User not found.");

  const isSuperadmin = user.roles.some((r) => r.role === "SUPERADMIN");
  const hadNoStaffRoles = !user.roles.some((r) => STAFF_ROLES.includes(r.role));

  const alreadyAssigned = user.roles.some(
    (r) => r.role === "CONFERENCE_ADMIN" && r.conferenceId === conferenceId,
  );

  await prisma.userRole.upsert({
    where: {
      userId_role_conferenceId: {
        userId,
        role: "CONFERENCE_ADMIN",
        conferenceId,
      },
    },
    create: {
      userId,
      role: "CONFERENCE_ADMIN",
      conferenceId,
    },
    update: {},
  });

  // If the user had no staff roles before, send an activation/upgrade email.
  let emailSent = false;
  if (hadNoStaffRoles && !alreadyAssigned) {
    let tempPassword = null;
    if (!user.passwordHash) {
      // No password set at all — generate a temporary one.
      tempPassword = generateTemporaryPassword();
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true },
      });
    }
    const profile = getProfileFromUser(user);
    const emailResult = await sendEmail({
      to: user.email,
      ...accountWelcomeEmail({
        name: profile.fullName || user.name || user.email,
        email: user.email,
        password: tempPassword || undefined,
        isUpgrade: true,
      }),
    });
    emailSent = emailResult.ok;
  }

  const admins = await listConferenceAdmins(conferenceId);
  return { admins, alreadyAssigned, isSuperadmin, emailSent };
}

/**
 * @param {object} params
 */
export async function createAndAssignConferenceAdmin({
  conferenceId,
  email,
  firstName,
  lastName,
  gender,
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { roles: true },
  });

  if (existing) {
    const { admins } = await assignConferenceAdmin(conferenceId, existing.id);
    return { admins, userId: existing.id, emailSent: false };
  }

  const tempPassword = generateTemporaryPassword();
  const profile = {
    firstName: firstName?.trim() || "",
    middleName: null,
    lastName: lastName?.trim() || "",
    gender: gender || "M",
    fullName: [firstName, lastName].filter(Boolean).join(" ").trim() || normalizedEmail,
  };

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: profile.fullName,
      profileData: profile,
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      roles: {
        create: {
          role: "CONFERENCE_ADMIN",
          conferenceId,
        },
      },
    },
  });

  await sendEmail({
    to: normalizedEmail,
    ...accountWelcomeEmail({
      name: profile.fullName,
      email: normalizedEmail,
      password: tempPassword,
    }),
  });

  const admins = await listConferenceAdmins(conferenceId);
  return { admins, userId: user.id, emailSent: true };
}

/**
 * @param {string} conferenceId
 * @param {string} userId
 */
export async function removeConferenceAdmin(conferenceId, userId) {
  const deleted = await prisma.userRole.deleteMany({
    where: {
      userId,
      conferenceId,
      role: "CONFERENCE_ADMIN",
    },
  });

  if (deleted.count === 0) {
    throw new Error("This user is not assigned as a conference admin for this conference.");
  }

  return listConferenceAdmins(conferenceId);
}
