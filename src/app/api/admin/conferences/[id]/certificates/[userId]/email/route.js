import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { emailCertificateForAdmin } from "@/lib/certificates/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const { id: conferenceId, userId } = await params;
  const access = await authorizeConferenceAccess(conferenceId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const result = await emailCertificateForAdmin(conferenceId, userId);

    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.CERTIFICATE_ADMIN_EMAIL,
      description: `Admin emailed certificate to ${result.email}`,
      resourceType: "certificate",
      resourceId: userId,
      conferenceId,
      metadata: { email: result.email },
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not email certificate.";
    return NextResponse.json(
      { error: message },
      { status: Number(err?.status) || 400 },
    );
  }
}
