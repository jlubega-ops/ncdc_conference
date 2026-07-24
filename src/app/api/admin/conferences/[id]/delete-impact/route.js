import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/guards";
import { getConferenceDeleteImpact } from "@/lib/conferences/delete";

/**
 * Preview cascade impact before permanently deleting a conference (superadmin).
 */
export async function GET(_request, { params }) {
  const { id } = await params;
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json(
      { error: "Only system administrators can delete conferences." },
      { status: 401 },
    );
  }

  const impact = await getConferenceDeleteImpact(id);
  if (!impact) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, impact });
}
