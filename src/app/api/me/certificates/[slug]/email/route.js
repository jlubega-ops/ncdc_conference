import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { emailCertificateToUser } from "@/lib/certificates/service";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const result = await emailCertificateToUser(session.user.id, slug);
    const conference = await prisma.conference.findFirst({
      where: { slug },
      select: { id: true, title: true },
    });
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.CERTIFICATE_EMAIL,
      description: `Emailed certificate for ${conference?.title || slug}`,
      resourceType: "certificate",
      conferenceId: conference?.id ?? null,
      metadata: { slug, ok: result.ok, skipped: result.skipped ?? false },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not email certificate.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
