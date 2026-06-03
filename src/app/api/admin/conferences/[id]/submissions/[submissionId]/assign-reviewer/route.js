import { NextResponse } from "next/server";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { assignPaperReviewer } from "@/lib/papers/service";

export async function POST(request, { params }) {
  const { id, submissionId } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    return NextResponse.json({ ok: true, submission });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not assign reviewer.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
