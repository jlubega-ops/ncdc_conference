import { after } from "next/server";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  assertCertificateCanBeEmailed,
  emailCertificateToUser,
} from "@/lib/certificates/service";
import {
  beginCertificateEmailJob,
  endCertificateEmailJob,
} from "@/lib/certificates/email-jobs";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in again, then try sending the email." },
      { status: 401 },
    );
  }

  const { slug } = await params;
  const userId = session.user.id;

  try {
    const { email } = await assertCertificateCanBeEmailed(userId, slug);
    if (!beginCertificateEmailJob(userId, slug)) {
      return NextResponse.json(
        { error: "Your certificate email is already being sent. Please wait a moment." },
        { status: 409 },
      );
    }

    after(async () => {
      try {
        const result = await emailCertificateToUser(userId, slug);
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
      } catch (err) {
        console.error("[certificate] Background email failed:", err);
      } finally {
        endCertificateEmailJob(userId, slug);
      }
    });

    return NextResponse.json({
      ok: true,
      queued: true,
      message: `Certificate email has been sent to ${email}.`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Email failed. Please try again.";
    const status = Number(err?.status) || 400;
    return NextResponse.json({ error: message }, { status });
  }
}
