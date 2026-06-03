import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { canManageConference } from "@/lib/auth/conference-access";
import { canReviewPaperSubmission } from "@/lib/papers/access";
import { guessMimeType, readPrivateFile } from "@/lib/storage/secure-files";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  const submission = await prisma.paperSubmission.findFirst({
    where: { fileId },
    select: { id: true, userId: true, conferenceId: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const isOwner = submission.userId === session.user.id;
  const isAdmin = canManageConference(session, submission.conferenceId);
  const isReviewer = await canReviewPaperSubmission(
    session,
    submission.conferenceId,
    submission.id,
  );

  if (!isOwner && !isAdmin && !isReviewer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buffer = await readPrivateFile("paper-submissions", fileId);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": guessMimeType(fileId),
        "Content-Disposition": `inline; filename="${fileId}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
