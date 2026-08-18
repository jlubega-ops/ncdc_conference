import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { mapSubmissionForAdmin, userSelect } from "@/lib/conferences/admin-data";

import { jsonNoStore } from "@/lib/http/no-store";

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const rows = await prisma.paperSubmission.findMany({
    where: { conferenceId: id },
    include: {
      user: { select: userSelect },
      assignedReviewer: { select: userSelect },
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
  });

  return jsonNoStore({
    submissions: rows.map(mapSubmissionForAdmin),
  });
}
