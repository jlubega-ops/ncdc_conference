import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceAccess } from "@/lib/auth/guards";
import {
  parseAttendeeCsv,
  validateAttendeeUploadRows,
} from "@/lib/registration/bulk-upload";

export async function POST(request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conference = await prisma.conference.findUnique({ where: { id } });
  if (!conference) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }
  if (conference.registrationMode !== "ADMIN_UPLOAD") {
    return NextResponse.json(
      { error: "Attendee upload is only available for Admin upload registration mode." },
      { status: 400 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Attach a CSV file." }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "CSV must be 2MB or smaller." }, { status: 400 });
    }

    const text = await file.text();
    const { rows } = parseAttendeeCsv(text);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No data rows found in the CSV." }, { status: 400 });
    }

    const preview = validateAttendeeUploadRows(rows);
    const validCount = preview.filter((r) => r.valid).length;
    const errorCount = preview.length - validCount;

    return NextResponse.json({
      ok: true,
      preview,
      summary: {
        total: preview.length,
        valid: validCount,
        withErrors: errorCount,
      },
    });
  } catch (err) {
    console.error("Attendee preview error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not preview file." },
      { status: 500 },
    );
  }
}
