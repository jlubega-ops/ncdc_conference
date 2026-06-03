import { NextResponse } from "next/server";
import { requirePaperReviewAccess } from "@/lib/auth/guards";
import { reviewPaperSubmission } from "@/lib/papers/service";

export async function POST(request, { params }) {
  const { id, submissionId } = await params;
  const session = await requirePaperReviewAccess(id, submissionId);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const submission = await reviewPaperSubmission({
      conferenceId: id,
      submissionId,
      reviewerId: session.user.id,
      action: body.action,
      reviewNotes: body.reviewNotes,
      improvementRequest: body.improvementRequest,
    });

    return NextResponse.json({ ok: true, submission });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
