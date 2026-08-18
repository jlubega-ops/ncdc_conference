import { requireSession } from "@/lib/auth/session";
import { jsonNoStore } from "@/lib/http/no-store";
import { getCertificateSummaries } from "@/lib/certificates/service";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const certificates = await getCertificateSummaries(session.user.id);
  return jsonNoStore({ certificates });
}
