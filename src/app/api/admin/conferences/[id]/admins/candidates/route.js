import { NextResponse } from "next/server";
import { authorizeSuperadminCapability } from "@/lib/auth/guards";
import { searchConferenceAdminCandidates } from "@/lib/conference-admins/service";

export async function GET(request, { params }) {
  const access = await authorizeSuperadminCapability();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id: conferenceId } = await params;
  const q = new URL(request.url).searchParams.get("q") ?? "";

  const candidates = await searchConferenceAdminCandidates(conferenceId, q);
  return NextResponse.json({ candidates });
}
