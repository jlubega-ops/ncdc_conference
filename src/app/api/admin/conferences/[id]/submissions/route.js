import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { mapSubmissionForAdmin, userSelect } from "@/lib/conferences/admin-data";

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  const rows = await prisma.paperSubmission.findMany({
    where: { conferenceId: id },
    include: {
      user: { select: userSelect },
      assignedReviewer: { select: userSelect },
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    submissions: rows.map(mapSubmissionForAdmin),
  });
}
