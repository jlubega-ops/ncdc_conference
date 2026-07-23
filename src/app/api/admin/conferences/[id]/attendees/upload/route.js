import { NextResponse } from "next/server";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { confirmAttendeeUpload } from "@/lib/registration/bulk-upload";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows to upload." }, { status: 400 });
    }

    const allowErrors = body.allowErrors !== false;
    const results = await confirmAttendeeUpload({
      conferenceId: id,
      rows,
      allowErrors,
    });

    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.ATTENDEES_UPLOAD,
      description: `Bulk attendee upload: ${results.created} created, ${results.updated} updated`,
      resourceType: "conference",
      resourceId: id,
      conferenceId: id,
      metadata: {
        rowCount: rows.length,
        created: results.created,
        updated: results.updated,
        emailed: results.emailed,
      },
    });

    return NextResponse.json({
      ok: true,
      results,
      message: `Upload complete: ${results.created} created, ${results.updated} updated, ${results.emailed} emails sent.`,
    });
  } catch (err) {
    console.error("Attendee upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed.";
    const status = message.includes("only available") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
