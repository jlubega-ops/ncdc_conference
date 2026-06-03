import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { markPaperFeedbackRead } from "@/lib/papers/service";

export async function POST(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await markPaperFeedbackRead(id, session.user.id);
  return NextResponse.json({ ok: true });
}
