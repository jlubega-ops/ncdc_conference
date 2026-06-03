import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getCertificateSummaries } from "@/lib/certificates/service";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificates = await getCertificateSummaries(session.user.id);
  return NextResponse.json({ certificates });
}
