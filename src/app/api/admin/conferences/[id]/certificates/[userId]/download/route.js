import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { getCertificatePdfForAdmin } from "@/lib/certificates/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";
import { jsonNoStore } from "@/lib/http/no-store";

export async function GET(_request, { params }) {
  const { id: conferenceId, userId } = await params;
  const access = await authorizeConferenceAccess(conferenceId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const { buffer, filename, certificateNumber } = await getCertificatePdfForAdmin(
      conferenceId,
      userId,
    );

    await logActivity({
      session,
      request: _request,
      action: ACTIVITY_ACTIONS.CERTIFICATE_ADMIN_DOWNLOAD,
      description: `Admin downloaded certificate ${certificateNumber}`,
      resourceType: "certificate",
      resourceId: userId,
      conferenceId,
      metadata: { certificateNumber },
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not download certificate.";
    return jsonNoStore({ error: message }, { status: Number(err?.status) || 400 });
  }
}
