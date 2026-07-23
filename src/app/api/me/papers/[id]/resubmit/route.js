import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { resubmitPaper } from "@/lib/papers/service";
import { mapPaperForAuthor } from "@/lib/papers/map";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const abstract = String(form.get("abstract") ?? "").trim();
    const file = form.get("file");

    const row = await resubmitPaper({
      paperId: id,
      userId: session.user.id,
      title,
      abstract,
      file: file instanceof File ? file : null,
    });

    const withConference = await prisma.paperSubmission.findUnique({
      where: { id: row.id },
      include: {
        conference: { select: { id: true, slug: true, title: true } },
      },
    });

    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.PAPER_RESUBMIT,
      description: `Resubmitted paper "${title || withConference?.title || id}"`,
      resourceType: "paper",
      resourceId: row.id,
      conferenceId: withConference?.conference?.id ?? null,
    });

    return NextResponse.json({
      ok: true,
      paper: mapPaperForAuthor(withConference ?? row),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resubmit paper.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
