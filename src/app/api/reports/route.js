import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { canAccessReports } from "@/lib/reports/access";
import { buildReport } from "@/lib/reports/service";

export async function GET(request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessReports(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const conferenceId = searchParams.get("conferenceId") ?? "all";
  const period = searchParams.get("period") ?? "all";
  const registrationStatus = searchParams.get("registrationStatus") ?? "all";

  const report = await buildReport(session, {
    conferenceId,
    period,
    registrationStatus,
  });

  return NextResponse.json({ report });
}
