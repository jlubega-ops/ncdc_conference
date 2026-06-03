import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateTemporaryPassword } from "@/lib/auth/credentials";
import { sendEmail } from "@/lib/email/mailer";
import {
  registrationApprovedEmail,
  registrationExistingAccountEmail,
  registrationRevisionEmail,
  registrationWelcomeEmail,
} from "@/lib/email/templates";
import { isRegistrableConference } from "@/lib/conferences/registrable";
import { mapConferenceForUi } from "@/lib/conferences/service";
import {
  buildProfilePayload,
  getProfileFromUser,
  mergeRegistrationWithProfile,
} from "@/lib/users/profile";

/**
 * @param {string} conferenceId
 * @param {string} email
 */
export async function findExistingRegistration(conferenceId, email) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { roles: true },
  });
  if (!user) return { user: null, registration: null };

  const registration = await prisma.conferenceRegistration.findUnique({
    where: {
      conferenceId_userId: { conferenceId, userId: user.id },
    },
  });
  return { user, registration };
}

/**
 * @param {{ conference: any, registration: any, mapped: any }} ctx
 */
export function registrationConflictResponse({ conference, registration }) {
  if (registration.status === "PENDING" || registration.status === "NEEDS_REVISION") {
    return {
      status: 409,
      body: {
        error: `You have already applied for ${conference.title}. Sign in to view your application status.`,
        code: "ALREADY_APPLIED",
        redirect: "/login",
      },
    };
  }
  if (registration.status === "CONFIRMED") {
    return {
      status: 409,
      body: {
        error: `You are already registered for ${conference.title}. Sign in to access your dashboard.`,
        code: "ALREADY_REGISTERED",
        redirect: "/login",
      },
    };
  }
  return {
    status: 409,
    body: {
      error: `A registration record already exists for ${conference.title}.`,
      code: "EXISTING_REGISTRATION",
      redirect: "/login",
    },
  };
}

/**
 * @param {string} slug
 */
export async function getConferenceForRegistration(slug) {
  const row = await prisma.conference.findFirst({
    where: { slug, publicationStatus: "PUBLISHED" },
  });
  if (!row) return null;
  const mapped = mapConferenceForUi(row);
  if (!isRegistrableConference(mapped)) return { conference: mapped, registrable: false };
  return { conference: mapped, registrable: true, raw: row };
}

/**
 * @param {object} params
 */
export async function registerUserForConference({
  conference,
  conferenceId,
  values,
  paymentProofFileId,
  isNewUser,
  tempPassword,
}) {
  const email = values.email.toLowerCase();

  if (isNewUser) {
    const user = await prisma.user.create({
      data: {
        email,
        name: values.fullName,
        passwordHash: await hashPassword(tempPassword),
        mustChangePassword: true,
        profileData: buildProfilePayload(values),
        roles: {
          create: { role: "ATTENDEE", conferenceId },
        },
        registrations: {
          create: {
            conferenceId,
            status: "PENDING",
            paymentStatus: conference.requiresPayment ? "pending_verification" : null,
            paymentProofFileId,
            formData: values,
          },
        },
      },
    });

    const emailResult = await sendEmail({
      to: email,
      ...registrationWelcomeEmail({
        name: values.fullName,
        email,
        password: tempPassword,
        conferenceTitle: conference.title,
      }),
    });

    return { user, isNewUser: true, emailSent: emailResult.ok };
  }

  let user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  if (!user) throw new Error("User not found.");

  const mergedValues = mergeRegistrationWithProfile(user, values);
  const profilePayload = buildProfilePayload(mergedValues);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        name: profilePayload.fullName || user.name,
        profileData: {
          ...getProfileFromUser(user),
          ...profilePayload,
        },
      },
    }),
    prisma.conferenceRegistration.create({
      data: {
        conferenceId,
        userId: user.id,
        status: "PENDING",
        paymentStatus: conference.requiresPayment ? "pending_verification" : null,
        paymentProofFileId,
        formData: mergedValues,
      },
    }),
  ]);

  const hasAttendee = user.roles.some(
    (r) => r.role === "ATTENDEE" && r.conferenceId === conferenceId,
  );
  if (!hasAttendee) {
    await prisma.userRole.create({
      data: { userId: user.id, role: "ATTENDEE", conferenceId },
    });
  }

  const emailResult = await sendEmail({
    to: email,
    ...registrationExistingAccountEmail({
      name: mergedValues.fullName || user.name || email,
      conferenceTitle: conference.title,
    }),
  });

  return { user, isNewUser: false, emailSent: emailResult.ok };
}

/**
 * Approve or request revision on a registration.
 */
export async function reviewRegistration({
  registrationId,
  conferenceId,
  reviewerId,
  action,
  adminNotes,
  improvementRequest,
}) {
  const registration = await prisma.conferenceRegistration.findFirst({
    where: { id: registrationId, conferenceId },
    include: {
      user: true,
      conference: true,
    },
  });

  if (!registration) throw new Error("Registration not found.");

  if (action === "approve") {
    if (registration.status === "CONFIRMED") {
      throw new Error("Registration is already approved.");
    }

    const requiresPayment = Boolean(registration.conference.requiresPayment);

    await prisma.conferenceRegistration.update({
      where: { id: registrationId },
      data: {
        status: "CONFIRMED",
        paymentStatus: requiresPayment ? "verified" : null,
        adminNotes: adminNotes || null,
        improvementRequest: null,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    });

    const hasAttendee = await prisma.userRole.findFirst({
      where: {
        userId: registration.userId,
        role: "ATTENDEE",
        conferenceId,
      },
    });
    if (!hasAttendee) {
      await prisma.userRole.create({
        data: {
          userId: registration.userId,
          role: "ATTENDEE",
          conferenceId,
        },
      });
    }

    await sendEmail({
      to: registration.user.email,
      ...registrationApprovedEmail({
        name: registration.user.name || registration.user.email,
        conferenceTitle: registration.conference.title,
        notes: adminNotes,
        conferenceSlug: registration.conference.slug,
      }),
    });

    return { status: "CONFIRMED" };
  }

  if (action === "request_revision") {
    if (!improvementRequest?.trim()) {
      throw new Error("Describe what the applicant should improve.");
    }

    await prisma.conferenceRegistration.update({
      where: { id: registrationId },
      data: {
        status: "NEEDS_REVISION",
        improvementRequest: improvementRequest.trim(),
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    });

    await sendEmail({
      to: registration.user.email,
      ...registrationRevisionEmail({
        name: registration.user.name || registration.user.email,
        conferenceTitle: registration.conference.title,
        improvementRequest: improvementRequest.trim(),
        notes: adminNotes,
      }),
    });

    return { status: "NEEDS_REVISION" };
  }

  throw new Error("Invalid review action.");
}

/**
 * Resend welcome email with a new temporary password (inactive accounts only).
 */
export async function resendAccountActivation({ registrationId, conferenceId }) {
  const registration = await prisma.conferenceRegistration.findFirst({
    where: { id: registrationId, conferenceId },
    include: { user: true, conference: true },
  });

  if (!registration) throw new Error("Registration not found.");
  if (!registration.user.mustChangePassword) {
    throw new Error("This account is already activated.");
  }

  const tempPassword = generateTemporaryPassword();
  await prisma.user.update({
    where: { id: registration.userId },
    data: {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
    },
  });

  const form =
    registration.formData && typeof registration.formData === "object"
      ? registration.formData
      : {};

  const emailResult = await sendEmail({
    to: registration.user.email,
    ...registrationWelcomeEmail({
      name: registration.user.name || form.fullName || registration.user.email,
      email: registration.user.email,
      password: tempPassword,
      conferenceTitle: registration.conference.title,
    }),
  });

  if (!emailResult.ok) {
    throw new Error(emailResult.error || "Could not send activation email.");
  }

  return { ok: true };
}

export { generateTemporaryPassword };
