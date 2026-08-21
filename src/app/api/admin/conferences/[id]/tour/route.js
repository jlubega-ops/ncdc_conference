import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import {
  addExistingUserToTour,
  addTourRegistrant,
  getConferenceTourAdminData,
  removeTourRegistration,
  searchTourRegistrationCandidates,
  tourRegistrationsToCsv,
  updateTourRegistration,
} from "@/lib/tour/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";
import { jsonNoStore } from "@/lib/http/no-store";

export async function GET(request, { params }) {
  const { id: conferenceId } = await params;
  const access = await authorizeConferenceAccess(conferenceId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  if (q != null) {
    try {
      const data = await searchTourRegistrationCandidates(conferenceId, q);
      return jsonNoStore(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not search.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  try {
    const data = await getConferenceTourAdminData(conferenceId);
    const format = url.searchParams.get("format");
    if (format === "csv" || format === "excel") {
      const csv = tourRegistrationsToCsv(data);
      const filename = `${data.conference?.slug || "conference"}-tour-registrations.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }
    return jsonNoStore(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load tour registrations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { id: conferenceId } = await params;
  const access = await authorizeConferenceAccess(conferenceId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const body = await request.json();
    const action = String(body.action || "add").trim();

    if (action === "addExisting") {
      const result = await addExistingUserToTour({
        conferenceId,
        userId: body.userId,
        amountPaid: body.amountPaid,
        organisation: body.organisation,
        notes: body.notes,
        registeredById: session.user.id,
      });
      const person = result.person;
      await logActivity({
        session,
        request,
        action: ACTIVITY_ACTIONS.TOUR_REGISTER,
        description: person
          ? `Added ${person.name}${person.email ? ` (${person.email})` : ""} to conference tour (amount ${person.amountPaidFormatted})`
          : "Added existing user to conference tour",
        resourceType: "tour_registration",
        resourceId: result.registration?.id,
        conferenceId,
        metadata: {
          source: "existing_user",
          userId: person?.userId || body.userId,
          name: person?.name || null,
          email: person?.email || null,
          organisation: person?.organisation || null,
          amountPaid: person?.amountPaid ?? null,
          notes: body.notes || null,
        },
      });
      return NextResponse.json(result);
    }

    if (action === "add" || action === "addNew") {
      const result = await addTourRegistrant({
        conferenceId,
        firstName: body.firstName,
        lastName: body.lastName,
        organisation: body.organisation,
        email: body.email,
        amountPaid: body.amountPaid,
        notes: body.notes,
        acknowledged: Boolean(body.acknowledged || body.forceDuplicate),
        registeredById: session.user.id,
      });
      if (result.needsConfirmation) {
        return NextResponse.json(result, { status: 409 });
      }
      const person = result.person;
      await logActivity({
        session,
        request,
        action: ACTIVITY_ACTIONS.TOUR_REGISTER,
        description: person
          ? `Added ${person.name}${person.email ? ` (${person.email})` : ""} to conference tour (amount ${person.amountPaidFormatted}${result.registered ? ", existing attendee" : ", tour only"})`
          : result.message,
        resourceType: "tour_registration",
        resourceId: result.registration?.id,
        conferenceId,
        metadata: {
          source: "new_or_adopted",
          confirmationType: result.confirmationType,
          linkedToConferenceRegistration: Boolean(result.registered),
          userId: person?.userId || null,
          name: person?.name || null,
          email: person?.email || null,
          organisation: person?.organisation || null,
          amountPaid: person?.amountPaid ?? null,
          notes: body.notes || null,
        },
      });
      return NextResponse.json(result);
    }

    if (action === "update") {
      const result = await updateTourRegistration({
        conferenceId,
        registrationId: body.registrationId,
        amountPaid: body.amountPaid,
        organisation: body.organisation,
        notes: body.notes,
      });
      await logActivity({
        session,
        request,
        action: ACTIVITY_ACTIONS.TOUR_UPDATE,
        description: `Updated conference tour registration ${body.registrationId}`,
        resourceType: "tour_registration",
        resourceId: body.registrationId,
        conferenceId,
        metadata: {
          amountPaid: body.amountPaid ?? null,
          organisation: body.organisation ?? null,
          notes: body.notes ?? null,
        },
      });
      return NextResponse.json(result);
    }

    if (action === "remove") {
      const result = await removeTourRegistration(conferenceId, body.registrationId);
      const removed = result.removed;
      await logActivity({
        session,
        request,
        action: ACTIVITY_ACTIONS.TOUR_REMOVE,
        description: removed
          ? `Removed ${removed.name}${removed.email ? ` (${removed.email})` : ""} from conference tour (amount was ${removed.amountPaidFormatted})`
          : "Removed conference tour registration",
        resourceType: "tour_registration",
        resourceId: body.registrationId,
        conferenceId,
        metadata: {
          userId: removed?.userId || null,
          name: removed?.name || null,
          email: removed?.email || null,
          organisation: removed?.organisation || null,
          amountPaid: removed?.amountPaid ?? null,
        },
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save tour registration.";
    return NextResponse.json(
      { error: message },
      { status: Number(err?.status) || 400 },
    );
  }
}
