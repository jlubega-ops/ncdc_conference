import { requireSession } from "@/lib/auth/session";
import { countUnreadPaperFeedback } from "@/lib/papers/service";
import { jsonNoStore } from "@/lib/http/no-store";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await countUnreadPaperFeedback(session.user.id);
  return jsonNoStore({ count });
}
