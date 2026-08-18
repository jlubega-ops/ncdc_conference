import { NextResponse } from "next/server";
import { authorizeSuperadmin } from "@/lib/auth/guards";
import { getConferenceDeleteImpact } from "@/lib/conferences/delete";

/**
 * Preview cascade impact before permanently deleting a conference (superadmin).
 */
export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await authorizeSuperadmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const impact = await getConferenceDeleteImpact(id);
  if (!impact) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, impact });
}
