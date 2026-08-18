import { NextResponse } from "next/server";
import { authorizeSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { mapConferenceForUi } from "@/lib/conferences/service";
import { jsonNoStore } from "@/lib/http/no-store";

export async function GET() {
  const access = await authorizeSuperadmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const rows = await prisma.conference.findMany({
    orderBy: { title: "asc" },
  });

  return jsonNoStore({
    conferences: rows.map(mapConferenceForUi),
  });
}
