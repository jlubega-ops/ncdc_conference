import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceManager } from "@/lib/auth/guards";
import { mapConferenceForUi } from "@/lib/conferences/service";
import { computeLifecycleStatus } from "@/lib/conferences/status";
import { validateConferenceForPublish } from "@/lib/conferences/validation";
import { slugify } from "@/lib/conferences/utils";

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
  const cfpOpenAt = input.cfpOpenAt ? new Date(input.cfpOpenAt) : null;
  const cfpCloseAt = input.cfpCloseAt ? new Date(input.cfpCloseAt) : null;
  const registrationOpenAt = input.registrationOpenAt ? new Date(input.registrationOpenAt) : null;
  const registrationCloseAt = input.registrationCloseAt ? new Date(input.registrationCloseAt) : null;
  const conferenceDays = Array.isArray(input.conferenceDays) ? input.conferenceDays : [];
  const lifecycleStatus = computeLifecycleStatus({
    cfpOpenAt,
    cfpCloseAt,
    registrationOpenAt,
    registrationCloseAt,
    conferenceDays,
  });

  const publicationStatus = input.publicationStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

  if (publicationStatus === "PUBLISHED") {
    const publishErrors = validateConferenceForPublish(input);
    if (Object.keys(publishErrors).length > 0) {
      throw new Error(
        Object.values(publishErrors)[0] || "Complete all required fields before publishing.",
      );
    }
  }

  return {
    slug: slugify(input.slug?.trim() || title),
    title,
    shortDescription: (input.shortDescription ?? "").trim() || null,
    description: (input.description ?? "").trim() || null,
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
    cfpOpenAt,
    cfpCloseAt,
    registrationOpenAt,
    registrationCloseAt,
    conferenceDays,
    timezone: (input.timezone ?? "Africa/Nairobi").trim() || "Africa/Nairobi",
    cfpTopics: Array.isArray(input.cfpTopics) ? input.cfpTopics.filter(Boolean) : [],
    submissionGuidelines: (input.submissionGuidelines ?? "").trim() || null,
    programme: Array.isArray(input.programme) ? input.programme : [],
    speakers: Array.isArray(input.speakers) ? input.speakers : [],
    faqs: Array.isArray(input.faqs) ? input.faqs : [],
    requiresPayment: Boolean(input.requiresPayment),
    paymentDetails: input.requiresPayment ? input.paymentDetails || null : null,
    paidContentVisibility: input.requiresPayment ? input.paidContentVisibility || null : null,
    onlineStream: input.onlineStream || null,
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

  const rows = await prisma.conference.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });
  return NextResponse.json({ conferences: rows.map(mapConferenceForUi) });
}

export async function POST(request) {
  const session = await requireConferenceManager();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = await request.json();
    const data = buildConferencePayload(input, session.user.id);

    const created = await prisma.conference.create({ data });
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
