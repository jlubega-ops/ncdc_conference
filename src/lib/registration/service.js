import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";
import {
  registrationExistingAccountEmail,
  registrationRevisionEmail,
  registrationReceivedEmail,
} from "@/lib/email/templates";
import { isRegistrableConference } from "@/lib/conferences/registrable";
import { mapConferenceForUi } from "@/lib/conferences/service";
import {
  buildProfilePayload,
  getProfileFromUser,
  mergeRegistrationWithProfile,
} from "@/lib/users/profile";
import { issueAndEmailAccessKey } from "@/lib/registration/access-key-issue";

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
 * @param {{ conference: any, registration: any }} ctx
 */
export function registrationConflictResponse({ conference, registration }) {
  if (registration.status === "PENDING" || registration.status === "NEEDS_REVISION") {
    return {
      status: 409,
      body: {
        error: `You have already applied for ${conference.title}. Check your email for updates, or sign in with your access code after approval.`,
        code: "ALREADY_APPLIED",
        redirect: "/login?mode=access",
      },
    };
  }
  if (registration.status === "CONFIRMED") {
    return {
      status: 409,
      body: {
        error: `You are already registered for ${conference.title}. Sign in with your access code.`,
        code: "ALREADY_REGISTERED",
        redirect: "/login?mode=access",
      },
    };
  }
  return {
    status: 409,
    body: {
      error: `A registration record already exists for ${conference.title}.`,
      code: "EXISTING_REGISTRATION",
      redirect: "/login?mode=access",
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
}) {
  const email = values.email.toLowerCase();
  const mode = conference.registrationMode || "MANUAL_APPROVE";
  if (mode === "OPEN_NO_REGISTRATION" || mode === "ADMIN_UPLOAD") {
    throw new Error("Public registration is not available for this conference.");
  }

  const autoApprove = mode === "AUTO_APPROVE";
  const initialStatus = autoApprove ? "CONFIRMED" : "PENDING";

  let user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  const isNewUser = !user;

  if (isNewUser) {
    user = await prisma.user.create({
      data: {
        email,
        name: values.fullName,
        passwordHash: null,
        mustChangePassword: false,
        profileData: buildProfilePayload(values),
        roles: {
          create: { role: "ATTENDEE", conferenceId },
        },
        registrations: {
          create: {
            conferenceId,
            status: initialStatus,
            paymentStatus: conference.requiresPayment
              ? autoApprove
                ? "verified"
                : "pending_verification"
              : null,
            paymentProofFileId,
            formData: values,
            reviewedAt: autoApprove ? new Date() : null,
          },
        },
      },
      include: { roles: true },
    });
  } else {
    const mergedValues = mergeRegistrationWithProfile(user, values);
    const mergedProfile = buildProfilePayload(mergedValues);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          name: mergedProfile.fullName || user.name,
          profileData: {
            ...getProfileFromUser(user),
            ...mergedProfile,
          },
        },
      }),
      prisma.conferenceRegistration.create({
        data: {
          conferenceId,
          userId: user.id,
          status: initialStatus,
          paymentStatus: conference.requiresPayment
            ? autoApprove
              ? "verified"
              : "pending_verification"
            : null,
          paymentProofFileId,
          formData: mergedValues,
          reviewedAt: autoApprove ? new Date() : null,
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
  }

  if (autoApprove) {
    const keyResult = await issueAndEmailAccessKey({
      user,
      conference,
    });
    return {
      user,
      isNewUser,
      emailSent: keyResult.emailSent,
      status: "CONFIRMED",
      accessKeyIssued: true,
    };
  }

  const emailResult = await sendEmail({
    to: email,
    ...(isNewUser
      ? registrationReceivedEmail({
          name: values.fullName || email,
          conferenceTitle: conference.title,
        })
      : registrationExistingAccountEmail({
          name: values.fullName || user.name || email,
          conferenceTitle: conference.title,
        })),
  });

  return {
    user,
    isNewUser,
    emailSent: emailResult.ok,
    status: "PENDING",
    accessKeyIssued: false,
  };
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

    const keyResult = await issueAndEmailAccessKey({
      user: registration.user,
      conference: registration.conference,
    });

    return { status: "CONFIRMED", accessKeyEmailed: keyResult.emailSent };
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin update of registration profile details, including email.
 * When email changes: old access keys for this conference are revoked;
 * if the registration is CONFIRMED, a new key is issued and emailed to the new address.
 *
 * @param {{
 *   conferenceId: string;
 *   registrationId: string;
 *   formData?: Record<string, unknown>;
 *   profile?: Record<string, unknown>;
 * }} params
 */
export async function updateRegistrationAttendeeByAdmin({
  conferenceId,
  registrationId,
  formData: incomingForm,
  profile: incomingProfile,
}) {
  const registration = await prisma.conferenceRegistration.findFirst({
    where: { id: registrationId, conferenceId },
    include: {
      user: {
        select: { id: true, email: true, name: true, profileData: true },
      },
      conference: true,
    },
  });
  if (!registration) {
    throw new Error("Registration not found.");
  }

  const existingForm =
    registration.formData && typeof registration.formData === "object"
      ? registration.formData
      : {};
  const incoming =
    incomingForm && typeof incomingForm === "object"
      ? incomingForm
      : incomingProfile && typeof incomingProfile === "object"
        ? incomingProfile
        : {};

  const previousEmail = registration.user.email.toLowerCase();
  const requestedEmailRaw =
    incoming.email !== undefined && incoming.email !== null
      ? String(incoming.email).trim().toLowerCase()
      : previousEmail;

  if (!requestedEmailRaw || !EMAIL_RE.test(requestedEmailRaw)) {
    throw new Error("Enter a valid email address.");
  }

  const emailChanged = requestedEmailRaw !== previousEmail;
  if (emailChanged) {
    const taken = await prisma.user.findUnique({ where: { email: requestedEmailRaw } });
    if (taken && taken.id !== registration.userId) {
      throw new Error("A user with this email already exists.");
    }
  }

  const profile = buildProfilePayload({
    ...getProfileFromUser(registration.user),
    ...existingForm,
    ...incoming,
  });

  const formData = {
    ...existingForm,
    ...incoming,
    ...profile,
    email: requestedEmailRaw,
  };

  const name = profile.fullName || registration.user.name;

  if (emailChanged) {
    await prisma.conferenceAccessKey.deleteMany({
      where: {
        conferenceId,
        OR: [
          { userId: registration.userId },
          { email: previousEmail },
          { email: requestedEmailRaw },
        ],
      },
    });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: registration.userId },
      data: {
        email: requestedEmailRaw,
        name,
        profileData: profile,
      },
    }),
    prisma.conferenceRegistration.update({
      where: { id: registration.id },
      data: { formData },
    }),
  ]);

  let accessKeyEmailed = false;
  let accessKeyIssueWarning = null;
  if (emailChanged && registration.status === "CONFIRMED") {
    const keyResult = await issueAndEmailAccessKey({
      user: {
        id: registration.userId,
        email: requestedEmailRaw,
        name,
      },
      conference: registration.conference,
      revokeExisting: true,
    });
    accessKeyEmailed = keyResult.emailSent;
    if (!keyResult.emailSent) {
      accessKeyIssueWarning =
        "Email was updated and the previous access code was revoked, but the new code email could not be sent. Use Resend access code.";
    }
  }

  return {
    emailChanged,
    accessKeyEmailed,
    accessKeyIssueWarning,
    previousEmail,
    email: requestedEmailRaw,
  };
}

/**
 * Resend access key email for a confirmed registration.
 */
export async function resendAccountActivation({ registrationId, conferenceId }) {
  const registration = await prisma.conferenceRegistration.findFirst({
    where: { id: registrationId, conferenceId },
    include: {
      user: {
        select: { id: true, email: true, name: true, profileData: true },
      },
      conference: true,
    },
  });

  if (!registration) throw new Error("Registration not found.");
  if (registration.status !== "CONFIRMED") {
    throw new Error("Approve the registration before sending an access code.");
  }

  const keyResult = await issueAndEmailAccessKey({
    user: registration.user,
    conference: registration.conference,
  });

  if (!keyResult.emailSent) {
    throw new Error("Could not send access code email.");
  }

  return { ok: true, message: "A new access code was emailed. The previous code no longer works." };
}

/**
 * Send (or re-send) access codes to one or more confirmed registrations.
 * @param {{
 *   conferenceId: string;
 *   registrationIds: string[];
 * }} params
 */
export async function sendAccessCodesBulk({ conferenceId, registrationIds }) {
  const ids = [...new Set((registrationIds || []).map((id) => String(id).trim()).filter(Boolean))];
  if (ids.length === 0) {
    throw new Error("Select at least one attendee.");
  }

  const rows = await prisma.conferenceRegistration.findMany({
    where: {
      conferenceId,
      id: { in: ids },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true, profileData: true },
      },
      conference: true,
    },
  });

  const byId = new Map(rows.map((r) => [r.id, r]));
  /** @type {{ sent: number; failed: Array<{ id: string; email: string; message: string }> }} */
  const results = { sent: 0, failed: [] };

  for (const id of ids) {
    const registration = byId.get(id);
    if (!registration) {
      results.failed.push({ id, email: "", message: "Registration not found." });
      continue;
    }
    if (registration.status !== "CONFIRMED") {
      results.failed.push({
        id,
        email: registration.user.email,
        message: "Only approved/confirmed attendees can receive access codes.",
      });
      continue;
    }
    try {
      const keyResult = await issueAndEmailAccessKey({
        user: registration.user,
        conference: registration.conference,
      });
      if (!keyResult.emailSent) {
        results.failed.push({
          id,
          email: registration.user.email,
          message: "Could not send access code email.",
        });
        continue;
      }
      results.sent += 1;
    } catch (err) {
      results.failed.push({
        id,
        email: registration.user.email,
        message: err instanceof Error ? err.message : "Send failed.",
      });
    }
  }

  return results;
}
