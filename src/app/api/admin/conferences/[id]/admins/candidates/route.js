import { NextResponse } from "next/server";
import { requireSuperadminCapability } from "@/lib/auth/guards";
import { searchConferenceAdminCandidates } from "@/lib/conference-admins/service";

export async function GET(request, { params }) {
  const session = await requireSuperadminCapability();
  if (!session) {
    return NextResponse.json({ error: "Only superadmins can search users." }, { status: 403 });
  }

  const { id: conferenceId } = await params;
  const q = new URL(request.url).searchParams.get("q") ?? "";

  const candidates = await searchConferenceAdminCandidates(conferenceId, q);
  return NextResponse.json({ candidates });
}
