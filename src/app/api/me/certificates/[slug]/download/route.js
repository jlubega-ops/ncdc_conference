import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonNoStore } from "@/lib/http/no-store";
import { getCertificatePdfForUser } from "@/lib/certificates/service";

export async function GET(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const { buffer, filename } = await getCertificatePdfForUser(session.user.id, slug);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate certificate.";
    return jsonNoStore({ error: message }, { status: 400 });
  }
}
