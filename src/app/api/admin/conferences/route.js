import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceManager, requireSuperadmin } from "@/lib/auth/guards";
import { getManagedConferenceIds } from "@/lib/auth/conference-access";
import { mapConferenceForUi, revalidatePublishedConferenceCache } from "@/lib/conferences/service";
import { computeLifecycleStatus } from "@/lib/conferences/status";
import { validateConferenceForPublish } from "@/lib/conferences/validation";
import { cascadeConferenceScheduleData } from "@/lib/conferences/cascade";
import { sanitizeOnlineStreamForSave, sanitizeBreakoutRoomsForSave, slugify } from "@/lib/conferences/utils";
import { generateConferenceReference, normalizeOrganiserShortName } from "@/lib/conferences/reference";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

/**
 * @param {any} input
 * @param {string} userId
 */
function buildConferencePayload(input, userId) {
  const title = (input.title ?? "").trim();
  if (!title) {
    throw new Error("Title is required.");
  }

  const startDate = input.startDate ? new Date(input.startDate) : null;
  const endDate = input.endDate ? new Date(input.endDate) : null;
  const allowPaperSubmissions = Boolean(input.allowPaperSubmissions);
  const cfpOpenAt =
    allowPaperSubmissions && input.cfpOpenAt ? new Date(input.cfpOpenAt) : null;
  const cfpCloseAt =
    allowPaperSubmissions && input.cfpCloseAt ? new Date(input.cfpCloseAt) : null;
  const registrationOpenAt = input.registrationOpenAt ? new Date(input.registrationOpenAt) : null;
  const registrationCloseAt = input.registrationCloseAt ? new Date(input.registrationCloseAt) : null;
  const conferenceDays = Array.isArray(input.conferenceDays)
    ? input.conferenceDays.filter((day) => day?.date)
    : [];
  const cascaded = cascadeConferenceScheduleData({
    conferenceDays,
    programme: input.programme,
    speakers: input.speakers,
  });
  const lifecycleStatus = computeLifecycleStatus({
    cfpOpenAt,
    cfpCloseAt,
    registrationOpenAt,
    registrationCloseAt,
    conferenceDays,
  });

  const publicationStatus = input.publicationStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const organiserName = (input.organiserName ?? "").trim() || null;
  const organiserShortName = normalizeOrganiserShortName(
    input.organiserShortName,
    organiserName || title,
  );

  if (publicationStatus === "PUBLISHED") {
    const publishErrors = validateConferenceForPublish({
      ...input,
      allowPaperSubmissions,
      organiserName,
      organiserShortName,
    });
    if (Object.keys(publishErrors).length > 0) {
      throw new Error(
        Object.values(publishErrors)[0] || "Complete all required fields before publishing.",
      );
    }
  }

  return {
    slug: slugify(input.slug?.trim() || title),
    reference:
      (input.reference ?? "").trim().toUpperCase() ||
      generateConferenceReference({
        year: startDate?.getFullYear() || new Date().getFullYear(),
        organiserShortName,
      }),
    registrationMode: [
      "AUTO_APPROVE",
      "MANUAL_APPROVE",
      "OPEN_NO_REGISTRATION",
      "ADMIN_UPLOAD",
    ].includes(input.registrationMode)
      ? input.registrationMode
      : "MANUAL_APPROVE",
    title,
    shortDescription:
      (input.shortDescription ?? "").trim() ||
      (input.description ?? "").trim().replace(/\s+/g, " ").slice(0, 200) ||
      null,
    description: (input.description ?? "").trim() || null,
    organiserName,
    organiserShortName,
    theme: (input.theme ?? "").trim() || null,
    subThemes: Array.isArray(input.subThemes) ? input.subThemes.filter(Boolean) : [],
    startDate,
    endDate,
    location: (input.location ?? "").trim() || null,
    venue: (input.venue ?? "").trim() || null,
    category: (input.category ?? "").trim() || null,
    lifecycleStatus,
    publicationStatus,
    featured: Boolean(input.featured),
    cardImage: (input.cardImage ?? "").trim() || null,
    allowPaperSubmissions,
    cfpOpenAt,
    cfpCloseAt,
    registrationOpenAt,
    registrationCloseAt,
    conferenceDays,
    timezone: (input.timezone ?? "Africa/Nairobi").trim() || "Africa/Nairobi",
    cfpTopics: allowPaperSubmissions
      ? Array.isArray(input.cfpTopics)
        ? input.cfpTopics.filter(Boolean)
        : []
      : [],
    submissionGuidelines: allowPaperSubmissions
      ? (input.submissionGuidelines ?? "").trim() || null
      : null,
    programme: cascaded.programme,
    speakers: cascaded.speakers,
    faqs: Array.isArray(input.faqs) ? input.faqs : [],
    feedbackSettings: input.feedbackSettings ?? null,
    attendanceSettings: input.attendanceSettings ?? null,
    certificateSettings: input.certificateSettings ?? null,
    giftsSettings: input.giftsSettings ?? null,
    requiresPayment: Boolean(input.requiresPayment),
    paymentDetails: input.requiresPayment ? input.paymentDetails || null : null,
    paidContentVisibility: input.requiresPayment ? input.paidContentVisibility || null : null,
    onlineStream: sanitizeOnlineStreamForSave(input.onlineStream),
    breakoutRooms: sanitizeBreakoutRoomsForSave(input.breakoutRooms),
    contacts: input.contacts || null,
    publishedAt: publicationStatus === "PUBLISHED" ? new Date() : null,
    createdById: userId,
  };
}

export async function GET() {
  const session = await requireConferenceManager();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const managedIds = getManagedConferenceIds(session);
  const rows = await prisma.conference.findMany({
    where: managedIds === null ? undefined : { id: { in: managedIds } },
    orderBy: [{ updatedAt: "desc" }],
  });
  return NextResponse.json({ conferences: rows.map(mapConferenceForUi) });
}

export async function POST(request) {
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json(
      { error: "Only system administrators can create conferences." },
      { status: 401 },
    );
  }

  try {
    const input = await request.json();
    const data = buildConferencePayload(input, session.user.id);

    const created = await prisma.conference.create({ data });
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.CONFERENCE_CREATE,
      description: `Created conference "${created.title}" (${created.publicationStatus}).`,
      resourceType: "conference",
      resourceId: created.id,
      conferenceId: created.id,
      metadata: {
        slug: created.slug,
        publicationStatus: created.publicationStatus,
      },
    });
    revalidatePublishedConferenceCache(created.slug);
    return NextResponse.json(
      {
        conference: mapConferenceForUi(created),
        message:
          created.publicationStatus === "PUBLISHED"
            ? "Conference created and published successfully."
            : "Conference draft created successfully.",
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create conference.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
