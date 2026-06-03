import { prisma } from "@/lib/prisma";
import {
  CATEGORIES,
  STATUS_LABELS,
} from "@/lib/conferences/constants";
import { computeLifecycleStatus } from "@/lib/conferences/status";
import { normalizePaidContentVisibility } from "@/lib/conferences/visibility";
import {
  formatDateRange,
  normalizeContacts,
  normalizeFaq,
  normalizeOnlineStream,
  normalizePaymentDetails,
  normalizeSpeaker,
} from "@/lib/conferences/utils";

const DEFAULT_IMAGE = "/assets/ncdc_image.jpg";

/**
 * @param {string} value
 */
function normalizeStatus(value) {
  if (!value) return "upcoming";
  return STATUS_LABELS[value] ? value : "upcoming";
}

/**
 * @param {unknown} value
 */
function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * @param {any} conference
 */
export function mapConferenceForUi(conference) {
  const cfpTopics = ensureArray(conference.cfpTopics).filter(Boolean);
  const subThemes = ensureArray(conference.subThemes).filter(Boolean);
  const programme = ensureArray(conference.programme);
  const speakers = ensureArray(conference.speakers)
    .map((item) => normalizeSpeaker(item))
    .filter(Boolean);
  const faqs = ensureArray(conference.faqs)
    .map((item) => normalizeFaq(item))
    .filter(Boolean);
  const conferenceDays = ensureArray(conference.conferenceDays);
  const sortedDays = conferenceDays
    .filter((day) => day?.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const derivedStartDate = sortedDays[0]?.date ? new Date(`${sortedDays[0].date}T00:00:00`) : null;
  const derivedEndDate = sortedDays[sortedDays.length - 1]?.date
    ? new Date(`${sortedDays[sortedDays.length - 1].date}T23:59:59`)
    : null;
  const startDate = conference.startDate ?? derivedStartDate;
  const endDate = conference.endDate ?? derivedEndDate;
  const computedStatus = computeLifecycleStatus({
    cfpOpenAt: conference.cfpOpenAt,
    cfpCloseAt: conference.cfpCloseAt,
    registrationOpenAt: conference.registrationOpenAt,
    registrationCloseAt: conference.registrationCloseAt,
    conferenceDays,
  });

  return {
    id: conference.id,
    slug: conference.slug,
    title: conference.title,
    shortDescription: conference.shortDescription ?? "",
    description: conference.description ?? "",
    theme: conference.theme ?? "",
    subThemes,
    dateRange: formatDateRange(startDate, endDate),
    startDate,
    endDate,
    year: startDate ? new Date(startDate).getFullYear() : null,
    location: conference.location ?? "",
    venue: conference.venue ?? "",
    category: conference.category ?? CATEGORIES[0],
    status: normalizeStatus(computedStatus || conference.lifecycleStatus),
    featured: Boolean(conference.featured),
    cardImage: conference.cardImage || DEFAULT_IMAGE,
    cfpOpenAt: conference.cfpOpenAt,
    cfpCloseAt: conference.cfpCloseAt,
    registrationOpenAt: conference.registrationOpenAt,
    registrationCloseAt: conference.registrationCloseAt,
    conferenceDays,
    timezone: conference.timezone ?? "Africa/Nairobi",
    cfpTopics,
    submissionGuidelines: conference.submissionGuidelines ?? "",
    programme,
    speakers,
    faqs,
    requiresPayment: Boolean(conference.requiresPayment),
    paymentDetails: normalizePaymentDetails(conference.paymentDetails),
    paidContentVisibility: normalizePaidContentVisibility(conference.paidContentVisibility),
    onlineStream: normalizeOnlineStream(conference.onlineStream),
    contacts: normalizeContacts(conference.contacts),
    publicationStatus: conference.publicationStatus,
    publishedAt: conference.publishedAt,
    createdAt: conference.createdAt,
    updatedAt: conference.updatedAt,
  };
}

export async function getPublishedConferences() {
  try {
    const rows = await prisma.conference.findMany({
      where: { publicationStatus: "PUBLISHED" },
      orderBy: [{ startDate: "asc" }, { title: "asc" }],
    });
    return rows.map(mapConferenceForUi);
  } catch (error) {
    console.error("Failed to load published conferences:", error);
    return [];
  }
}

/**
 * @param {string} slug
 */
export async function getPublishedConferenceBySlug(slug) {
  const row = await prisma.conference.findFirst({
    where: { slug, publicationStatus: "PUBLISHED" },
  });
  return row ? mapConferenceForUi(row) : null;
}

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} [session]
 */
export async function getAdminConferences(session) {
  const { getManagedConferenceIds } = await import("@/lib/auth/conference-access");
  const managedIds = session ? getManagedConferenceIds(session) : null;

  const rows = await prisma.conference.findMany({
    where: managedIds === null ? undefined : { id: { in: managedIds } },
    orderBy: [{ updatedAt: "desc" }],
  });
  return rows.map(mapConferenceForUi);
}

/**
 * @param {string} id
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} [session]
 */
export async function getConferenceByIdForAdmin(id, session) {
  const row = await prisma.conference.findUnique({ where: { id } });
  if (!row) return null;

  if (session) {
    const { canManageConference } = await import("@/lib/auth/conference-access");
    if (!canManageConference(session, id)) return null;
  }

  return mapConferenceForUi(row);
}

/**
 * @param {Array<any>} conferences
 * @param {number} [limit]
 */
export function buildFeaturedConferences(conferences, limit = 6) {
  return conferences.filter((c) => c.featured).slice(0, limit);
}

/**
 * @param {Array<any>} conferences
 */
export function buildOpenCalls(conferences) {
  return conferences
    .filter((c) => c.status === "cfp_open" && c.cfpCloseAt)
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      deadline: c.cfpCloseAt,
    }))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}

/**
 * @param {Array<any>} conferences
 * @param {number} [limit]
 */
export function buildUpcomingDeadlines(conferences, limit = 6) {
  const now = new Date();
  const items = conferences.flatMap((c) => {
    const entries = [];
    if (c.cfpCloseAt) {
      entries.push({
        date: c.cfpCloseAt,
        label: "Call for papers closes",
        conference: c.title,
        slug: c.slug,
      });
    }
    if (c.registrationCloseAt) {
      entries.push({
        date: c.registrationCloseAt,
        label: "Registration closes",
        conference: c.title,
        slug: c.slug,
      });
    }
    return entries;
  });

  return items
    .filter((d) => d?.date && new Date(d.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, limit);
}
