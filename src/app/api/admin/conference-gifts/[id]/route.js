import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import {
  getConferenceGiftsAdminData,
  giftsReportToCsv,
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
  const session = access.session;

  try {
    const { searchParams } = new URL(request.url);
    const data = await getConferenceGiftsAdminData(id, {
      category: searchParams.get("category") || "",
    });

    const format = searchParams.get("format");
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

    return NextResponse.json(data);
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
    const issuance = await upsertGiftIssuance({
      conferenceId: id,
      recipientKey: String(body.recipientKey || "").trim(),
      category: String(body.category || "").trim(),
      items: body.items && typeof body.items === "object" ? body.items : {},
      issuedById: session.user?.id ?? null,
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
