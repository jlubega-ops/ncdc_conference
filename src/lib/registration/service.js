import { prisma } from "@/lib/prisma";
import { getConferenceYear, isRegistrableConference } from "@/lib/conferences/registrable";
import { mapConferenceForUi } from "@/lib/conferences/service";

/**
 * @param {string} conferenceId
 * @param {string} email
 */
export async function findExistingRegistration(conferenceId, email) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
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
export function registrationConflictResponse({ conference, registration, mapped }) {
  const year = getConferenceYear(mapped);
  if (registration.status === "PENDING") {
    return {
      status: 409,
      body: {
        error: `You have already registered for ${conference.title}. Your application is awaiting admin activation. You will receive an access key by email once approved.`,
        code: "PENDING_ACTIVATION",
      },
    };
  }
  if (registration.status === "CONFIRMED") {
    return {
      status: 409,
      body: {
        error: `You are already registered for ${conference.title}. Sign in with your email and access key (NCDC/Conf${year}/…).`,
        code: "ALREADY_REGISTERED",
      },
    };
  }
  return {
    status: 409,
    body: {
      error: `A registration already exists for ${conference.title}. Contact the organizers if you need assistance.`,
      code: "EXISTING_REGISTRATION",
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
