import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { buildProfilePayload, getProfileFromUser } from "@/lib/users/profile";
import { issueAndEmailAccessKey } from "@/lib/registration/access-key-issue";
import { rememberOrganisation } from "@/lib/organisations/service";
import { adoptUserForConferencePerson } from "@/lib/users/merge-conference-person";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} firstName
 * @param {string} lastName
 */
function normalizeNamePart(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * @returns {string}
 */
function placeholderEmail() {
  return `noemail.${Date.now().toString(36)}.${randomBytes(3).toString("hex")}@ncdc.local`;
}

/**
 * @param {any} user
 */
function userDisplayName(user) {
  const profile = getProfileFromUser(user);
  return profile.fullName || user?.name || user?.email || "—";
}

/**
 * Find people already registered on THIS conference (email or same first+last name).
 * Existing platform users who are not registered here are not duplicates.
 * @param {{
 *   conferenceId: string;
 *   firstName: string;
 *   lastName: string;
 *   email?: string | null;
 *   excludeUserId?: string | null;
 * }} params
 */
export async function findAttendeeDuplicates({
  conferenceId,
  firstName,
  lastName,
  email,
  excludeUserId = null,
}) {
  const first = normalizeNamePart(firstName).toLowerCase();
  const last = normalizeNamePart(lastName).toLowerCase();
  const normalizedEmail = email ? String(email).trim().toLowerCase() : "";

  /** @type {Array<{ userId: string; email: string; name: string; registrationId: string | null; status: string | null; match: string }>} */
  const matches = [];
  const seen = new Set();

  function pushMatch(user, registration, match) {
    if (!user?.id || !registration?.id || seen.has(user.id)) return;
    if (excludeUserId && user.id === excludeUserId) return;
    seen.add(user.id);
    matches.push({
      userId: user.id,
      email: user.email,
      name: userDisplayName(user),
      registrationId: registration.id,
      status: registration.status ?? null,
      match,
    });
  }

  if (normalizedEmail && EMAIL_RE.test(normalizedEmail)) {
    const byEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        registrations: {
          where: { conferenceId },
          take: 1,
        },
      },
    });
    if (byEmail?.registrations?.[0]) {
      pushMatch(byEmail, byEmail.registrations[0], "email");
    }
  }

  if (first && last) {
    const registrations = await prisma.conferenceRegistration.findMany({
      where: { conferenceId },
      include: {
        user: {
          select: { id: true, email: true, name: true, profileData: true },
        },
      },
    });
    for (const reg of registrations) {
      const profile = getProfileFromUser(reg.user);
      const form =
        reg.formData && typeof reg.formData === "object" ? reg.formData : {};
      const firstCand = normalizeNamePart(
        form.firstName || profile.firstName || "",
      ).toLowerCase();
      const lastCand = normalizeNamePart(
        form.lastName || profile.lastName || "",
      ).toLowerCase();
      if (firstCand === first && lastCand === last) {
        pushMatch(reg.user, reg, "name");
      }
    }
  }

  return matches;
}

/**
 * Admin manually adds an attendee for any registration mode that keeps a roster.
 * Does not email an access code — use Send access codes later.
 * @param {{
 *   conferenceId: string;
 *   firstName: string;
 *   lastName: string;
 *   email?: string | null;
 *   comment?: string | null;
 *   organisation?: string | null;
 *   forceDuplicate?: boolean;
 *   createdById?: string | null;
 * }} params
 */
export async function addAttendeeByAdmin({
  conferenceId,
  firstName,
  lastName,
  email,
  comment = null,
  organisation = null,
  forceDuplicate = false,
  createdById = null,
}) {
  const first = normalizeNamePart(firstName);
  const last = normalizeNamePart(lastName);
  if (!first || !last) {
    throw new Error("First name and last name are required.");
  }

  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) throw new Error("Conference not found.");

  let normalizedEmail = email ? String(email).trim().toLowerCase() : "";
  const emailProvided = Boolean(normalizedEmail);
  if (emailProvided && !EMAIL_RE.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  const duplicates = await findAttendeeDuplicates({
    conferenceId,
    firstName: first,
    lastName: last,
    email: normalizedEmail || null,
  });

  if (duplicates.length > 0) {
    return {
      needsConfirmation: true,
      allowForce: false,
      duplicates,
      message:
        "This person is already registered for this conference. Open their existing registration instead of adding them again.",
    };
  }

  // forceDuplicate is ignored for conference-registration duplicates (never create a second row).
  void forceDuplicate;

  const organisationName = String(organisation || "").trim();
  const profile = buildProfilePayload({
    firstName: first,
    lastName: last,
    institution: organisationName,
  });
  const fullName = profile.fullName || `${first} ${last}`;
  const adminComment = String(comment || "").trim() || null;

  const adopted = await adoptUserForConferencePerson({
    conferenceId,
    email: emailProvided ? normalizedEmail : null,
    firstName: first,
    lastName: last,
    institution: organisationName,
  });

  let user = adopted.user;

  if (!user) {
    if (!emailProvided) {
      normalizedEmail = placeholderEmail();
    }
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: fullName,
        profileData: profile,
        roles: {
          create: { role: "ATTENDEE", conferenceId },
        },
      },
      include: { roles: true },
    });
  } else {
    if (!emailProvided) {
      normalizedEmail = user.email;
    }
    const existingProfile = getProfileFromUser(user);
    profile.institution = organisationName || existingProfile.institution || "";
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: fullName,
        profileData: {
          ...existingProfile,
          ...profile,
        },
      },
    });
    const { invalidateCertificatePdfsForUser } = await import("@/lib/certificates/service");
    await invalidateCertificatePdfsForUser(user.id).catch(() => {});
    const hasRole = user.roles.some(
      (r) => r.role === "ATTENDEE" && r.conferenceId === conferenceId,
    );
    if (!hasRole) {
      await prisma.userRole.create({
        data: { userId: user.id, role: "ATTENDEE", conferenceId },
      });
    }
  }

  const existingReg = await prisma.conferenceRegistration.findUnique({
    where: { conferenceId_userId: { conferenceId, userId: user.id } },
  });
  if (existingReg) {
    return {
      needsConfirmation: true,
      allowForce: false,
      duplicates: [
        {
          userId: user.id,
          email: user.email,
          name: fullName,
          registrationId: existingReg.id,
          status: existingReg.status,
          match: "existing",
        },
      ],
      message:
        "This person is already registered for this conference. Open their existing registration instead of adding them again.",
    };
  }

  const formData = {
    ...profile,
    email: emailProvided ? normalizedEmail : "",
    emailOmitted: !emailProvided,
    addedByAdmin: true,
  };

  const registration = await prisma.conferenceRegistration.create({
    data: {
      conferenceId,
      userId: user.id,
      status: "CONFIRMED",
      formData,
      adminNotes: adminComment,
      reviewedAt: new Date(),
      registeredById: createdById || null,
      registeredBySource: "ADMIN",
    },
    include: {
      user: {
        select: { id: true, email: true, name: true, profileData: true },
      },
    },
  });

  // Create access code for admin view/copy, but do not email it.
  const keyResult = await issueAndEmailAccessKey({
    user: registration.user,
    conference,
    sendEmail: false,
  });

  rememberOrganisation(organisationName);

  return {
    needsConfirmation: false,
    registration,
    accessKey: keyResult.accessKey,
    emailSent: false,
    emailOmitted: !emailProvided,
    message: emailProvided
      ? "Attendee added. Access code is ready but not emailed — use Send access codes when you want to notify them."
      : "Attendee added without email. Copy their access code and share it manually when ready.",
  };
}

/**
 * Assign a representative for a registered attendee (principal).
 * The representative may be new or already registered.
 * @param {{
 *   conferenceId: string;
 *   principalRegistrationId: string;
 *   firstName: string;
 *   lastName: string;
 *   email?: string | null;
 *   notes?: string | null;
 *   forceExisting?: boolean;
 *   createdById?: string | null;
 * }} params
 */
export async function assignRepresentativeByAdmin({
  conferenceId,
  principalRegistrationId,
  firstName,
  lastName,
  email,
  notes,
  forceExisting = false,
  createdById = null,
}) {
  const first = normalizeNamePart(firstName);
  const last = normalizeNamePart(lastName);
  if (!first || !last) {
    throw new Error("Representative first name and last name are required.");
  }

  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) throw new Error("Conference not found.");

  const principal = await prisma.conferenceRegistration.findFirst({
    where: { id: principalRegistrationId, conferenceId },
    include: {
      user: { select: { id: true, email: true, name: true, profileData: true } },
    },
  });
  if (!principal) throw new Error("Registration not found.");

  let normalizedEmail = email ? String(email).trim().toLowerCase() : "";
  const emailProvided = Boolean(normalizedEmail);
  if (emailProvided && !EMAIL_RE.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  const duplicates = await findAttendeeDuplicates({
    conferenceId,
    firstName: first,
    lastName: last,
    email: normalizedEmail || null,
    excludeUserId: principal.userId,
  });

  const alreadyRegistered = duplicates.filter((d) => d.registrationId);
  if (alreadyRegistered.length > 0 && !forceExisting) {
    return {
      needsConfirmation: true,
      duplicates: alreadyRegistered,
      message:
        "This person is already registered for this conference. Still assign them as a representative?",
    };
  }

  const profile = buildProfilePayload({
    firstName: first,
    lastName: last,
  });
  const fullName = profile.fullName || `${first} ${last}`;

  const adopted = await adoptUserForConferencePerson({
    conferenceId,
    email: emailProvided ? normalizedEmail : null,
    firstName: first,
    lastName: last,
  });

  let repUser = adopted.user;

  if (!repUser) {
    if (!emailProvided) {
      const existingByName = duplicates.find((d) => d.match === "name");
      if (existingByName) {
        normalizedEmail = existingByName.email;
        repUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { roles: true },
        });
      }
    }
  }

  if (!repUser) {
    if (!emailProvided) {
      normalizedEmail = placeholderEmail();
    }
    repUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: fullName,
        profileData: profile,
        roles: {
          create: { role: "ATTENDEE", conferenceId },
        },
      },
      include: { roles: true },
    });
  } else {
    const hasRole = repUser.roles.some(
      (r) => r.role === "ATTENDEE" && r.conferenceId === conferenceId,
    );
    if (!hasRole) {
      await prisma.userRole.create({
        data: { userId: repUser.id, role: "ATTENDEE", conferenceId },
      });
    }
  }

  if (repUser.id === principal.userId) {
    throw new Error("A person cannot be their own representative.");
  }

  const existingLink = await prisma.conferenceRepresentative.findUnique({
    where: {
      conferenceId_principalUserId_representativeUserId: {
        conferenceId,
        principalUserId: principal.userId,
        representativeUserId: repUser.id,
      },
    },
  });
  if (existingLink) {
    throw new Error("This person is already assigned as a representative for this attendee.");
  }

  let repRegistration = await prisma.conferenceRegistration.findUnique({
    where: {
      conferenceId_userId: { conferenceId, userId: repUser.id },
    },
  });

  if (!repRegistration) {
    repRegistration = await prisma.conferenceRegistration.create({
      data: {
        conferenceId,
        userId: repUser.id,
        status: "CONFIRMED",
        formData: {
          ...profile,
          email: emailProvided ? normalizedEmail : "",
          emailOmitted: !emailProvided,
          addedAsRepresentative: true,
        },
        reviewedAt: new Date(),
        registeredById: createdById || null,
        registeredBySource: "ADMIN",
      },
    });

    await issueAndEmailAccessKey({
      user: {
        id: repUser.id,
        email: repUser.email,
        name: fullName,
      },
      conference,
      sendEmail: false,
    });
  }

  const link = await prisma.conferenceRepresentative.create({
    data: {
      conferenceId,
      principalRegistrationId: principal.id,
      principalUserId: principal.userId,
      representativeRegistrationId: repRegistration.id,
      representativeUserId: repUser.id,
      notes: notes?.trim() || null,
      createdById: createdById || null,
    },
    include: {
      representativeUser: {
        select: { id: true, email: true, name: true, profileData: true },
      },
      principalUser: {
        select: { id: true, email: true, name: true, profileData: true },
      },
    },
  });

  return {
    needsConfirmation: false,
    representative: {
      id: link.id,
      notes: link.notes,
      createdAt: link.createdAt,
      user: {
        id: link.representativeUser.id,
        email: link.representativeUser.email,
        name: userDisplayName(link.representativeUser),
      },
      registrationId: repRegistration.id,
    },
    message: "Representative assigned.",
  };
}

/**
 * @param {string} conferenceId
 */
export async function listRepresentativesForConference(conferenceId) {
  const rows = await prisma.conferenceRepresentative.findMany({
    where: { conferenceId },
    include: {
      representativeUser: {
        select: { id: true, email: true, name: true, profileData: true },
      },
      principalUser: {
        select: { id: true, email: true, name: true, profileData: true },
      },
      representativeRegistration: {
        select: { id: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    notes: row.notes,
    createdAt: row.createdAt,
    principalUserId: row.principalUserId,
    principalRegistrationId: row.principalRegistrationId,
    representativeUserId: row.representativeUserId,
    representativeRegistrationId: row.representativeRegistrationId,
    representative: {
      id: row.representativeUser.id,
      email: row.representativeUser.email,
      name: userDisplayName(row.representativeUser),
      registrationId: row.representativeRegistrationId,
      status: row.representativeRegistration?.status ?? null,
    },
    principal: {
      id: row.principalUser.id,
      email: row.principalUser.email,
      name: userDisplayName(row.principalUser),
      registrationId: row.principalRegistrationId,
    },
  }));
}
