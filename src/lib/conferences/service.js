import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  CATEGORIES,
  STATUS_LABELS,
} from "@/lib/conferences/constants";
import {
  normalizeConferenceReferenceInput,
} from "@/lib/conferences/reference";
import { computeLifecycleStatus } from "@/lib/conferences/status";
import { normalizePaidContentVisibility } from "@/lib/conferences/visibility";
import {
  formatDateRange,
  normalizeContacts,
  normalizeFaq,
  normalizeOnlineStream,
  normalizePaymentDetails,
  normalizeSpeaker,
  normalizeBreakoutRooms,
} from "@/lib/conferences/utils";
import { normalizeFeedbackSettings } from "@/lib/feedback/questions";
import { normalizeGiftsSettings, applyGiftCategoryAvailability } from "@/lib/gifts/settings";
import { normalizeAttendanceSettings } from "@/lib/attendance/settings";
import { normalizeCertificateSettings } from "@/lib/certificates/settings";
import { normalizeConferenceDays } from "@/lib/attendance/utils";

const DEFAULT_IMAGE = "/assets/bg_image.jpg";

/**
 * Published and not completed — available for public discovery.
 * @param {ReturnType<typeof mapConferenceForUi>} conference
 */
export function isOpenPublicConference(conference) {
  if (conference.publicationStatus !== "PUBLISHED") return false;
  if (conference.registrationMode === "ADMIN_UPLOAD") return false;
  return conference.status !== "completed";
}

/**
 * Invite-only conferences (admin uploads list) are hidden from public browse/search.
 * @param {ReturnType<typeof mapConferenceForUi> | { registrationMode?: string }} conference
 */
export function isInviteOnlyConference(conference) {
  return (conference.registrationMode || "MANUAL_APPROVE") === "ADMIN_UPLOAD";
}

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
    reference: conference.reference || String(conference.slug || "").toUpperCase(),
    registrationMode: conference.registrationMode || "MANUAL_APPROVE",
    title: conference.title,
    shortDescription:
      conference.shortDescription?.trim() ||
      (conference.description
        ? String(conference.description).replace(/\s+/g, " ").trim().slice(0, 200)
        : ""),
    description: conference.description ?? "",
    organiserName: conference.organiserName ?? "",
    organiserShortName: conference.organiserShortName ?? "",
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
    allowPaperSubmissions: Boolean(conference.allowPaperSubmissions),
    cfpOpenAt: conference.cfpOpenAt,
    cfpCloseAt: conference.cfpCloseAt,
    registrationOpenAt: conference.registrationOpenAt,
    registrationCloseAt: conference.registrationCloseAt,
    conferenceDays: normalizeConferenceDays(conferenceDays),
    timezone: conference.timezone ?? "Africa/Nairobi",
    cfpTopics,
    submissionGuidelines: conference.submissionGuidelines ?? "",
    programme,
    speakers,
    faqs,
    feedbackSettings: normalizeFeedbackSettings(conference.feedbackSettings),
    attendanceSettings: normalizeAttendanceSettings(conference.attendanceSettings),
    certificateSettings: normalizeCertificateSettings(conference.certificateSettings, {
      totalDays: normalizeConferenceDays(conferenceDays).length || 1,
    }),
    giftsSettings: applyGiftCategoryAvailability(
      normalizeGiftsSettings(conference.giftsSettings),
      speakers,
    ),
    requiresPayment: Boolean(conference.requiresPayment),
    paymentDetails: normalizePaymentDetails(conference.paymentDetails),
    paidContentVisibility: normalizePaidContentVisibility(conference.paidContentVisibility),
    onlineStream: normalizeOnlineStream(conference.onlineStream),
    breakoutRooms: normalizeBreakoutRooms(conference.breakoutRooms),
    contacts: normalizeContacts(conference.contacts),
    publicationStatus: conference.publicationStatus,
    publishedAt: conference.publishedAt,
    createdAt: conference.createdAt,
    updatedAt: conference.updatedAt,
  };
}

export const PUBLISHED_CONFERENCES_CACHE_TAG = "published-conferences";

export async function getPublishedConferences() {
  try {
    const rows = await prisma.conference.findMany({
      where: {
        publicationStatus: "PUBLISHED",
        NOT: { registrationMode: "ADMIN_UPLOAD" },
      },
      orderBy: [{ startDate: "asc" }, { title: "asc" }],
    });
    return rows.map(mapConferenceForUi);
  } catch (error) {
    console.error("Failed to load published conferences:", error);
    return [];
  }
}

export const getPublishedConferencesCached = unstable_cache(
  async () => getPublishedConferences(),
  ["published-conferences-list"],
  { revalidate: 60, tags: [PUBLISHED_CONFERENCES_CACHE_TAG] },
);

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
 * @param {string} slug
 */
export function getPublishedConferenceBySlugCached(slug) {
  return unstable_cache(
    async () => getPublishedConferenceBySlug(slug),
    ["published-conference", slug],
    {
      revalidate: 30,
      tags: [PUBLISHED_CONFERENCES_CACHE_TAG, `conference:${slug}`],
    },
  )();
}

/**
 * @param {string} [slug]
 */
export function revalidatePublishedConferenceCache(slug) {
  revalidateTag(PUBLISHED_CONFERENCES_CACHE_TAG, "max");
  if (slug) revalidateTag(`conference:${slug}`, "max");
}

/**
 * Search open (published, not completed) conferences by title or reference.
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 */
export async function searchOpenConferences(query, opts = {}) {
  const q = String(query ?? "").trim();
  if (q.length < 2) return [];

  const limit = opts.limit ?? 8;
  const rows = await prisma.conference.findMany({
    where: { publicationStatus: "PUBLISHED" },
    orderBy: [{ startDate: "asc" }, { title: "asc" }],
    take: 80,
  });

  const needle = q.toLowerCase();
  const needleRef = normalizeConferenceReferenceInput(q);

  return rows
    .map(mapConferenceForUi)
    .filter(isOpenPublicConference)
    .filter((c) => {
      const ref = normalizeConferenceReferenceInput(c.reference || "");
      const titleMatch = c.title.toLowerCase().includes(needle);
      const slugMatch = c.slug.toLowerCase().includes(needle);
      // Prefix-only on reference so unique leading characters narrow results as users type.
      const refMatch = ref.startsWith(needleRef);
      return titleMatch || slugMatch || refMatch;
    })
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      reference: c.reference,
      title: c.title,
      dateRange: c.dateRange,
      status: c.status,
      statusLabel: STATUS_LABELS[c.status] ?? c.status,
      href: `/conferences/${c.slug}`,
    }));
}

/**
 * Resolve an open conference by exact reference or slug/code.
 * @param {string} raw
 */
export async function getOpenConferenceByCodeOrReference(raw) {
  const code = String(raw ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!code) return null;

  const slugCandidate = code.toLowerCase().replace(/\s+/g, "-");
  const refCandidate = code.toUpperCase().replace(/\s+/g, "");

  const row = await prisma.conference.findFirst({
    where: {
      publicationStatus: "PUBLISHED",
      OR: [
        { slug: slugCandidate },
        { reference: refCandidate },
      ],
    },
  });

  if (!row) return null;
  const mapped = mapConferenceForUi(row);
  if (!isOpenPublicConference(mapped)) return null;
  return mapped;
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
