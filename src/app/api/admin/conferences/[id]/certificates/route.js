import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { listConferenceCertificatesForAdmin } from "@/lib/certificates/service";
import { jsonNoStore } from "@/lib/http/no-store";

export async function GET(_request, { params }) {
  const { id: conferenceId } = await params;
  const access = await authorizeConferenceAccess(conferenceId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const data = await listConferenceCertificatesForAdmin(conferenceId);
    return jsonNoStore(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load certificates.";
    const status = message.includes("not enabled") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
