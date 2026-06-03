import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { mapConferenceForUi } from "@/lib/conferences/service";

export async function GET() {
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.conference.findMany({
    orderBy: { title: "asc" },
  });

  return NextResponse.json({
    conferences: rows.map(mapConferenceForUi),
  });
}
