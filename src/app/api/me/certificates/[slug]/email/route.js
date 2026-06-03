import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { emailCertificateToUser } from "@/lib/certificates/service";

export async function POST(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const result = await emailCertificateToUser(session.user.id, slug);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not email certificate.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
