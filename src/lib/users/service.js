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
 * Returns true if the user currently has no staff roles at all (only ATTENDEE or nothing).
 * Used to decide whether to send an activation email when a staff role is first assigned.
 * @param {{ roles: Array<{ role: string }> }} user
 */
function hasNoStaffRoles(user) {
  const STAFF = ["SUPERADMIN", "CONFERENCE_ADMIN", "REVIEWER"];
  return !user.roles.some((r) => STAFF.includes(r.role));
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

  return {
    ok: true,
    tempPassword,
    emailSent: emailResult.ok,
    message: emailResult.ok
      ? "Activation email sent with a new temporary password."
      : "A new temporary password was generated but the email could not be sent. Copy it manually.",
  };
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

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  if (!existing) {
    throw new Error("User not found.");
  }

  if (values.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: values.email } });
    if (emailTaken) {
      return { errors: { email: "A user with this email already exists." } };
    }
  }

  // Detect if we're adding the user's first staff role — they'll need an activation email.
  const wasAttendeeOnly = hasNoStaffRoles(existing);
  const addingStaffRoles = values.roles.length > 0;

  const roleCreates = buildRoleCreates(values.roles, values.conferenceIds);

  // If the user had no password (edge case: attendee account with only an access key),
  // generate a temp password so they can sign in as staff.
  let tempPassword = null;
  let updatedPasswordHash = undefined;
  if (wasAttendeeOnly && addingStaffRoles && !existing.passwordHash) {
    tempPassword = generateTemporaryPassword();
    updatedPasswordHash = await hashPassword(tempPassword);
  }

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
        ...(updatedPasswordHash ? { passwordHash: updatedPasswordHash, mustChangePassword: true } : {}),
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

  // Send activation/welcome email if this is the first time staff roles are being added.
  let emailSent = false;
  if (wasAttendeeOnly && addingStaffRoles) {
    const emailResult = await sendEmail({
      to: values.email,
      ...accountWelcomeEmail({
        name: values.profile.fullName,
        email: values.email,
        password: tempPassword || undefined,
        isUpgrade: true,
      }),
    });
    emailSent = emailResult.ok;
  }

  return {
    user: mapUserForAdminList(user),
    emailSent,
    message:
      wasAttendeeOnly && addingStaffRoles
        ? emailSent
          ? "User updated and staff account activation email sent."
          : "User updated but activation email could not be sent."
        : "User updated.",
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

  const giftCount = await prisma.conferenceGiftIssuance.count({
    where: { userId },
  });
  if (giftCount > 0) {
    throw new Error(
      "This user was issued gifts and cannot be deleted. Gift records must be kept.",
    );
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
 * Superadmin resets a user's password to a new temporary password and sends them an email.
 * The user must change the password on next login (mustChangePassword = true).
 * @param {string} userId
 */
export async function resetPasswordByAdmin(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  if (!user) throw new Error("User not found.");

  const STAFF = ["SUPERADMIN", "CONFERENCE_ADMIN", "REVIEWER"];
  const isStaff = user.roles.some((r) => STAFF.includes(r.role));
  if (!isStaff) {
    throw new Error("Password reset is only available for staff accounts (admins and reviewers). Attendees use access codes.");
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
      isReset: true,
    }),
  });

  return {
    ok: true,
    tempPassword,
    emailSent: emailResult.ok,
    message: emailResult.ok
      ? "Password reset. A new temporary password was sent by email."
      : "Password reset but the email could not be sent. Copy the temporary password and share it manually.",
  };
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
