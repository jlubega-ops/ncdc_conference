import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { countUnreadPaperFeedback } from "@/lib/papers/service";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await countUnreadPaperFeedback(session.user.id);
  return NextResponse.json({ count });
}
