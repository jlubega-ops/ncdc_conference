import { NextResponse } from "next/server";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { getAttendeeUploadTemplateCsv } from "@/lib/registration/bulk-upload";

export async function GET(_request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csv = getAttendeeUploadTemplateCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendee-upload-template.csv"`,
    },
  });
}
