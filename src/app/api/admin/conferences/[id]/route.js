import { NextResponse } from "next/server";
import { authorizeConferenceAccess, requireSuperadmin } from "@/lib/auth/guards";
import { mapConferenceForUi } from "@/lib/conferences/service";
import { revalidatePublishedConferenceCache } from "@/lib/conferences/public-cache";
import { computeLifecycleStatus } from "@/lib/conferences/status";
import { validateConferenceForPublish } from "@/lib/conferences/validation";
import { cascadeConferenceScheduleData } from "@/lib/conferences/cascade";
import { sanitizeOnlineStreamForSave, sanitizeBreakoutRoomsForSave, slugify } from "@/lib/conferences/utils";
import { normalizeOrganiserShortName } from "@/lib/conferences/reference";
import { deleteConferenceWithCascade } from "@/lib/conferences/delete";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";
import { prisma } from "@/lib/prisma";

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
    ...(typeof input.reference === "string" && input.reference.trim()
      ? { reference: input.reference.trim().toUpperCase() }
      : {}),
    ...(
      [
        "AUTO_APPROVE",
        "MANUAL_APPROVE",
        "OPEN_NO_REGISTRATION",
        "ADMIN_UPLOAD",
      ].includes(input.registrationMode)
        ? { registrationMode: input.registrationMode }
        : {}
    ),
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
  };
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const input = await request.json();
    const data = buildUpdatePayload(input);
    const updated = await prisma.conference.update({
      where: { id },
      data,
    });
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.CONFERENCE_UPDATE,
      description: `Updated conference "${updated.title}" (${updated.publicationStatus}).`,
      resourceType: "conference",
      resourceId: updated.id,
      conferenceId: updated.id,
      metadata: { publicationStatus: updated.publicationStatus, slug: updated.slug },
    });
    revalidatePublishedConferenceCache(updated.slug);
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

export async function DELETE(request, { params }) {
  const { id } = await params;
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json(
      { error: "Only system administrators can delete conferences." },
      { status: 401 },
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* confirm may be missing */
  }
  if (String(body.confirm || "").trim() !== "DELETE") {
    return NextResponse.json(
      { error: "Type DELETE to confirm permanent conference deletion." },
      { status: 400 },
    );
  }

  try {
    const result = await deleteConferenceWithCascade(id);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.CONFERENCE_DELETE,
      description: `Deleted conference "${result.title}" (${result.deletedOrphanAttendees} orphan attendee account(s) removed).`,
      resourceType: "conference",
      resourceId: id,
      conferenceId: id,
      metadata: {
        deletedOrphanAttendees: result.deletedOrphanAttendees,
        registrationCount: result.impact.registrationCount,
        orphanEmails: result.orphanUsers.map((u) => u.email),
      },
    });
    for (const orphan of result.orphanUsers) {
      await logActivity({
        session,
        request,
        action: ACTIVITY_ACTIONS.USER_DELETE,
        description: `Deleted attendee ${orphan.email} after conference "${result.title}" deletion (only belonged to that conference).`,
        resourceType: "user",
        resourceId: orphan.id,
        conferenceId: id,
        metadata: {
          email: orphan.email,
          reason: "orphan_attendee_after_conference_delete",
        },
      });
    }
    revalidatePublishedConferenceCache(result.impact?.conference?.slug);
    return NextResponse.json({
      ok: true,
      message: result.message,
      deletedOrphanAttendees: result.deletedOrphanAttendees,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete conference.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
