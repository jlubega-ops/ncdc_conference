import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { markPaperFeedbackRead } from "@/lib/papers/service";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const paper = await prisma.paperSubmission.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, conferenceId: true, title: true },
  });
  await markPaperFeedbackRead(id, session.user.id);
  if (paper) {
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.PAPER_READ_FEEDBACK,
      description: `Marked feedback as read for "${paper.title}"`,
      resourceType: "paper",
      resourceId: id,
      conferenceId: paper.conferenceId,
    });
  }
  return NextResponse.json({ ok: true });
}
