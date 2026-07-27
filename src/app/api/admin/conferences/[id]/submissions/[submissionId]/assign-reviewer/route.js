import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { assignPaperReviewer } from "@/lib/papers/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const { id, submissionId } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const body = await request.json();
    const submission = await assignPaperReviewer({
      conferenceId: id,
      submissionId,
      assignerId: session.user.id,
      userId: body.userId,
      mode: body.mode,
      email: body.email,
      name: body.name,
    });

    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.PAPER_ASSIGN_REVIEWER,
      description: `Assigned reviewer to paper "${submission.title || submissionId}"`,
      resourceType: "paper",
      resourceId: submissionId,
      conferenceId: id,
      metadata: {
        reviewerId: submission.assignedReviewerId ?? body.userId ?? null,
        mode: body.mode ?? null,
      },
    });

    return NextResponse.json({ ok: true, submission });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not assign reviewer.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
