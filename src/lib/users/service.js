import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateTemporaryPassword } from "@/lib/auth/credentials";
import { sendEmail } from "@/lib/email/mailer";
import { accountWelcomeEmail } from "@/lib/email/templates";
import { mapUserForAdminList, getProfileFromUser } from "@/lib/users/profile";
import { invalidateCertificatePdfsForUser } from "@/lib/certificates/service";
import {
  validateAdminCreateUser,
  validateAdminUpdateUser,
  validateProfileUpdate,
} from "@/lib/users/validation";
import { deleteUserAndRelatedData } from "@/lib/users/orphan-attendee";

/**
 * @param {string[]} roles
 * @param {string[]} conferenceIds
 */
function buildRoleCreates(roles, conferenceIds) {
  /** @type {Array<{ role: string; conferenceId: string | null }>} */
  const creates = [];

  for (const role of roles) {
    if (role === "SUPERADMIN") {
      creates.push({ role: "SUPERADMIN", conferenceId: null });
      continue;
    }
    if (role === "CONFERENCE_ADMIN") {
      // Without conferences, skip — role is only assigned when a conference is selected.
      for (const conferenceId of conferenceIds) {
        creates.push({ role: "CONFERENCE_ADMIN", conferenceId });
      }
    }
  }

  const seen = new Set();
  return creates.filter((r) => {
    const key = `${r.role}:${r.conferenceId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function listUsersForAdmin() {
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: {
          conference: { select: { id: true, title: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map(mapUserForAdminList);
}

/**
 * @param {object} data
 */
export async function createUserByAdmin(data) {
  const { errors, values } = validateAdminCreateUser(data);
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const existing = await prisma.user.findUnique({ where: { email: values.email } });
  if (existing) {
    return { errors: { email: "A user with this email already exists." } };
  }

  const tempPassword = generateTemporaryPassword();
  const roleCreates = buildRoleCreates(values.roles, values.conferenceIds);

  const user = await prisma.user.create({
    data: {
      email: values.email,
      name: values.profile.fullName,
      profileData: values.profile,
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      roles: {
        create: roleCreates.map((r) => ({
          role: r.role,
          conferenceId: r.conferenceId,
        })),
      },
    },
    include: {
      roles: {
        include: {
          conference: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  });

  const emailResult = await sendEmail({
    to: values.email,
    ...accountWelcomeEmail({
      name: values.profile.fullName,
      email: values.email,
      password: tempPassword,
    }),
  });

  return {
    user: mapUserForAdminList(user),
    emailSent: emailResult.ok,
    message: emailResult.ok
      ? "User created and activation email sent."
      : "User created but activation email could not be sent.",
  };
}

/**
 * @param {string} userId
 */
export async function resendUserActivation(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");
  if (!user.mustChangePassword) {
    throw new Error("This account is already activated.");
  }

  const tempPassword = generateTemporaryPassword();
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
    },
  });

  const emailResult = await sendEmail({
    to: user.email,
    ...accountWelcomeEmail({
      name: user.name || user.email,
      email: user.email,
      password: tempPassword,
    }),
  });

  if (!emailResult.ok) {
    throw new Error(emailResult.error || "Could not send activation email.");
  }

  return { ok: true };
}

/**
 * @param {string} userId
 * @param {object} data
 */
export async function updateUserByAdmin(userId, data) {
  const { errors, values } = validateAdminUpdateUser(data);
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new Error("User not found.");
  }

  if (values.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: values.email } });
    if (emailTaken) {
      return { errors: { email: "A user with this email already exists." } };
    }
  }

  const roleCreates = buildRoleCreates(values.roles, values.conferenceIds);

  const user = await prisma.$transaction(async (tx) => {
    // Keep attendee/reviewer roles (assigned via conferences); only replace admin form roles.
    await tx.userRole.deleteMany({
      where: {
        userId,
        role: { in: ["SUPERADMIN", "CONFERENCE_ADMIN"] },
      },
    });
    return tx.user.update({
      where: { id: userId },
      data: {
        email: values.email,
        name: values.profile.fullName,
        profileData: values.profile,
        roles: {
          create: roleCreates.map((r) => ({
            role: r.role,
            conferenceId: r.conferenceId,
          })),
        },
      },
      include: {
        roles: {
          include: {
            conference: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    });
  });

  await invalidateCertificatePdfsForUser(userId).catch(() => {});

  return {
    user: mapUserForAdminList(user),
    message: "User updated.",
  };
}

/**
 * @param {string} userId
 * @param {string} actingUserId
 */
export async function deleteUserByAdmin(userId, actingUserId) {
  if (userId === actingUserId) {
    throw new Error("You cannot delete your own account.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  if (!user) throw new Error("User not found.");

  const isSuperadmin = user.roles.some((r) => r.role === "SUPERADMIN");
  if (isSuperadmin) {
    const superadminCount = await prisma.userRole.count({
      where: { role: "SUPERADMIN" },
    });
    if (superadminCount <= 1) {
      throw new Error("Cannot delete the only super admin account.");
    }
  }

  await deleteUserAndRelatedData(userId);
  return {
    ok: true,
    message:
      "User deleted. All related data (registrations, attendance, feedback, certificates, papers, access keys, gifts, sessions, and roles) was removed.",
  };
}

/**
 * @param {string} userId
 */
export async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");
  return {
    email: user.email,
    mustChangePassword: user.mustChangePassword,
    profile: getProfileFromUser(user),
  };
}

/**
 * @param {string} userId
 * @param {Record<string, unknown>} data
 */
export async function updateUserProfile(userId, data) {
  const { errors, values } = validateProfileUpdate(data);
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: values.profile.fullName,
      profileData: values.profile,
    },
  });

  await invalidateCertificatePdfsForUser(userId).catch(() => {});

  return { profile: getProfileFromUser(user) };
}

/**
 * @param {string} email
 */
export async function getRegistrationPrefill(email) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return null;
  return getProfileFromUser(user);
}
