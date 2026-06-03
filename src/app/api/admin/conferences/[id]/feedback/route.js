import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { mapFeedbackForAdmin, userSelect } from "@/lib/conferences/admin-data";

export async function GET(_request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.conferenceFeedback.findMany({
    where: { conferenceId: id },
    include: { user: { select: userSelect } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    feedback: rows.map(mapFeedbackForAdmin),
  });
}
