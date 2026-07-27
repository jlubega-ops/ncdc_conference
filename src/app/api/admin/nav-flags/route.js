import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceManager } from "@/lib/auth/guards";
import { getManagedConferenceIds } from "@/lib/auth/conference-access";
import { getDashboardNavFeatureFlags } from "@/lib/conferences/feature-visibility";

/**
 * Lightweight feature flags for dashboard sidebar — avoids loading full conference payloads.
 */
export async function GET() {
  const session = await requireConferenceManager();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json({
    flags: getDashboardNavFeatureFlags(rows),
  });
}
