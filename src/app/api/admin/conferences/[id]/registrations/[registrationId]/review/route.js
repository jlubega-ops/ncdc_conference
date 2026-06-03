import { NextResponse } from "next/server";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { reviewRegistration } from "@/lib/registration/service";

export async function POST(request, { params }) {
  const { id, registrationId } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, adminNotes, improvementRequest } = body;

    const result = await reviewRegistration({
      registrationId,
      conferenceId: id,
      reviewerId: session.user.id,
      action,
      adminNotes,
      improvementRequest,
    });

    return NextResponse.json({ ok: true, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
