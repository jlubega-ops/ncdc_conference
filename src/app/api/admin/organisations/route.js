import { NextResponse } from "next/server";
import { authorizeConferenceManager } from "@/lib/auth/guards";
import { listKnownOrganisations } from "@/lib/organisations/service";
import { jsonNoStore } from "@/lib/http/no-store";

export async function GET() {
  const access = await authorizeConferenceManager();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const organisations = await listKnownOrganisations();
  return jsonNoStore({ organisations });
}
