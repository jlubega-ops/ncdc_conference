import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { mapConferenceForUi } from "@/lib/conferences/service";
import { computeLifecycleStatus } from "@/lib/conferences/status";
import { validateConferenceForPublish } from "@/lib/conferences/validation";
import { cascadeConferenceScheduleData } from "@/lib/conferences/cascade";
import { slugify } from "@/lib/conferences/utils";

/**
 * @param {any} input
 */
function buildUpdatePayload(input) {
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
    shortDescription:
      (input.shortDescription ?? "").trim() ||
      (input.description ?? "").trim().replace(/\s+/g, " ").slice(0, 200) ||
      null,
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
    programme: cascaded.programme,
    speakers: cascaded.speakers,
    faqs: Array.isArray(input.faqs) ? input.faqs : [],
    requiresPayment: Boolean(input.requiresPayment),
    paymentDetails: input.requiresPayment ? input.paymentDetails || null : null,
    paidContentVisibility: input.requiresPayment ? input.paidContentVisibility || null : null,
    onlineStream: input.onlineStream || null,
    contacts: input.contacts || null,
    publishedAt: publicationStatus === "PUBLISHED" ? new Date() : null,
  };
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = await request.json();
    const data = buildUpdatePayload(input);
    const updated = await prisma.conference.update({
      where: { id },
      data,
    });
    return NextResponse.json({
      conference: mapConferenceForUi(updated),
      message:
        updated.publicationStatus === "PUBLISHED"
          ? "Conference updated and published successfully."
          : "Conference draft updated successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update conference.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await prisma.conference.delete({ where: { id } });
    return NextResponse.json({
      ok: true,
      message:
        "Conference deleted successfully. All related data was also removed based on cascade rules.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete conference.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
