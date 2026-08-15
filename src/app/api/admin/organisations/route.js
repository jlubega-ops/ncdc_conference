import { NextResponse } from "next/server";
import { requireConferenceManager } from "@/lib/auth/guards";
import { listKnownOrganisations } from "@/lib/organisations/service";

export async function GET() {
  const session = await requireConferenceManager();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organisations = await listKnownOrganisations();
  return NextResponse.json({ organisations });
}
