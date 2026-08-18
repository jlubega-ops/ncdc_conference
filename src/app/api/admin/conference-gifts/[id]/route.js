import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { jsonNoStore } from "@/lib/http/no-store";
import {
  addGiftRecipientAndIssue,
  getConferenceGiftsAdminData,
  getGiftIssuersReport,
  giftIssuersReportToCsv,
  giftsReportToCsv,
  maybeMarkAttendanceForGiftIssue,
  upsertGiftIssuance,
} from "@/lib/gifts/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function GET(request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (format === "issuers" || format === "issuers-excel") {
      const issuers = await getGiftIssuersReport(id);
      if (format === "issuers-excel") {
        const csv = giftIssuersReportToCsv(issuers);
        const filename = `${issuers.conference?.slug || "conference"}-gifts-by-admin.csv`;
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }
      return jsonNoStore(issuers);
    }

    const data = await getConferenceGiftsAdminData(id, {
      category: searchParams.get("category") || "",
    });

    if (format === "csv" || format === "excel") {
      const csv = giftsReportToCsv(data);
      const filename = `${data.conference?.slug || "conference"}-gifts.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return jsonNoStore(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load gifts.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const action = String(body.action || "").trim();
    const items = body.items && typeof body.items === "object" ? body.items : {};

    if (action === "addAndIssue") {
      const result = await addGiftRecipientAndIssue({
        conferenceId: id,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        comment: body.comment,
        acknowledged: Boolean(body.acknowledged || body.forceDuplicate),
        items,
        issuedById: session.user?.id ?? null,
      });

      if (result.needsConfirmation) {
        return NextResponse.json(result, { status: 409 });
      }

      await logActivity({
        session,
        request,
        action: ACTIVITY_ACTIONS.GIFT_ISSUE,
        description: result.registered
          ? "Issued gifts to registered participant"
          : "Added gifts-only recipient and issued awards",
        resourceType: "gift",
        resourceId: result.issuance?.id ?? result.recipientKey,
        conferenceId: id,
        metadata: {
          category: "participants",
          giftsOnly: !result.registered,
        },
      });

      return NextResponse.json({
        ok: true,
        message: result.message,
        issuance: result.issuance,
        recipientKey: result.recipientKey,
        registered: result.registered,
      });
    }

    const issuance = await upsertGiftIssuance({
      conferenceId: id,
      recipientKey: String(body.recipientKey || "").trim(),
      category: String(body.category || "").trim(),
      items,
      issuedById: session.user?.id ?? null,
    });

    const parsedUserId =
      String(body.userId || "").trim() || issuance.userId || null;
    await maybeMarkAttendanceForGiftIssue({
      conferenceId: id,
      userId: parsedUserId,
      isConferenceRegistered: Boolean(body.isConferenceRegistered),
      attendanceAction: String(body.attendanceAction || "").trim(),
      markedById: session.user?.id ?? null,
    });
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.GIFT_ISSUE,
      description: `Issued gifts (${body.category || "uncategorized"})`,
      resourceType: "gift",
      resourceId: issuance?.id ?? String(body.recipientKey || "").trim(),
      conferenceId: id,
      metadata: { category: body.category || null },
    });
    return NextResponse.json({ ok: true, issuance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not issue gifts.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
