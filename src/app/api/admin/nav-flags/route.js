import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeConferenceManager } from "@/lib/auth/guards";
import { getManagedConferenceIds } from "@/lib/auth/conference-access";
import { getDashboardNavFeatureFlags } from "@/lib/conferences/feature-visibility";
import { jsonNoStore } from "@/lib/http/no-store";

/**
 * Lightweight feature flags for dashboard sidebar — avoids loading full conference payloads.
 */
export async function GET() {
  const access = await authorizeConferenceManager();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  const managedIds = getManagedConferenceIds(session);
  const rows = await prisma.conference.findMany({
    where: managedIds === null ? undefined : { id: { in: managedIds } },
    select: {
      allowPaperSubmissions: true,
      registrationMode: true,
      conferenceDays: true,
      giftsSettings: true,
    },
  });

  return jsonNoStore({
    flags: getDashboardNavFeatureFlags(rows),
  });
}
