import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/conferences/utils";
import { generateConferenceReference } from "@/lib/conferences/reference";
import { mapConferenceForUi } from "@/lib/conferences/service";

/**
 * Ensure slug is unique by appending -2, -3, …
 * @param {string} baseSlug
 */
async function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug || "conference-copy";
  let n = 2;
  while (await prisma.conference.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
  return slug;
}

/**
 * Duplicate a conference configuration as a new draft titled "{title} - copy".
 * Does not copy registrations, attendance, papers, gifts issued, access keys, or admins.
 *
 * @param {string} conferenceId
 * @param {string} createdById
 */
export async function duplicateConference(conferenceId, createdById) {
  const source = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!source) {
    throw new Error("Conference not found.");
  }

  const title = `${source.title} - copy`;
  const baseSlug = slugify(title) || `${source.slug}-copy`;
  const slug = await ensureUniqueSlug(baseSlug);
  const year = source.startDate
    ? new Date(source.startDate).getFullYear()
    : new Date().getFullYear();
  const reference = generateConferenceReference({
    year,
    organiserShortName: source.organiserShortName || source.organiserName || title,
  });

  const created = await prisma.conference.create({
    data: {
      slug,
      reference,
      registrationMode: source.registrationMode,
      title,
      shortDescription: source.shortDescription,
      description: source.description,
      organiserName: source.organiserName,
      organiserShortName: source.organiserShortName,
      theme: source.theme,
      subThemes: source.subThemes ?? undefined,
      startDate: source.startDate,
      endDate: source.endDate,
      location: source.location,
      venue: source.venue,
      category: source.category,
      lifecycleStatus: source.lifecycleStatus,
      publicationStatus: "DRAFT",
      featured: false,
      cardImage: source.cardImage,
      allowPaperSubmissions: source.allowPaperSubmissions,
      cfpOpenAt: source.cfpOpenAt,
      cfpCloseAt: source.cfpCloseAt,
      registrationOpenAt: source.registrationOpenAt,
      registrationCloseAt: source.registrationCloseAt,
      conferenceDays: source.conferenceDays ?? undefined,
      timezone: source.timezone,
      cfpTopics: source.cfpTopics ?? undefined,
      submissionGuidelines: source.submissionGuidelines,
      programme: source.programme ?? undefined,
      speakers: source.speakers ?? undefined,
      faqs: source.faqs ?? undefined,
      feedbackSettings: source.feedbackSettings ?? undefined,
      giftsSettings: source.giftsSettings ?? undefined,
      requiresPayment: source.requiresPayment,
      paymentDetails: source.paymentDetails ?? undefined,
      paidContentVisibility: source.paidContentVisibility ?? undefined,
      onlineStream: source.onlineStream ?? undefined,
      contacts: source.contacts ?? undefined,
      publishedAt: null,
      createdById,
    },
  });

  return {
    conference: mapConferenceForUi(created),
    sourceTitle: source.title,
    message: `Conference duplicated as "${title}" (draft). Registrations and attendee data were not copied.`,
  };
}
