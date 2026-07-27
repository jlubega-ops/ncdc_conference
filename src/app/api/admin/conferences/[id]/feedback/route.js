import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import {
  feedbackReportToCsv,
  getConferenceFeedbackReport,
} from "@/lib/feedback/admin-report";
import { renderFeedbackReportPdf } from "@/lib/feedback/pdf-report";

export async function GET(request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const report = await getConferenceFeedbackReport(id);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (format === "csv" || format === "excel") {
      const csv = feedbackReportToCsv(report);
      const filename = `${report.conference.slug || "conference"}-feedback.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "pdf") {
      const buffer = await renderFeedbackReportPdf(report);
      const filename = `${report.conference.slug || "conference"}-feedback.pdf`;
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load feedback.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
