import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { savePrivateUpload } from "@/lib/storage/secure-files";
import { requireApprovedRegistration, getConferenceContextForPapers } from "@/lib/papers/access";
import { mapPaperForAuthor } from "@/lib/papers/map";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function GET(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const ctx = await getConferenceContextForPapers(slug);
  if (!ctx) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }

  const rows = await prisma.paperSubmission.findMany({
    where: {
      conferenceId: ctx.conference.id,
      userId: session.user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  const access = await requireApprovedRegistration(session.user.id, ctx.conference.id);

  return NextResponse.json({
    conference: { id: ctx.conference.id, slug: ctx.conference.slug, title: ctx.conference.title },
    cfpOpen: ctx.cfpOpen,
    canSubmit: access.ok && ctx.cfpOpen,
    registrationApproved: access.ok,
    papers: rows.map(mapPaperForAuthor),
  });
}

export async function POST(request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const ctx = await getConferenceContextForPapers(slug);
  if (!ctx) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }
  if (!ctx.cfpOpen) {
    return NextResponse.json({ error: "Call for papers is not open." }, { status: 400 });
  }

  const access = await requireApprovedRegistration(session.user.id, ctx.conference.id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const abstract = String(form.get("abstract") ?? "").trim();
    const file = form.get("file");

    if (!title) {
      return NextResponse.json({ error: "Paper title is required." }, { status: 400 });
    }

    let fileId = null;
    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: "Upload a PDF or Word document." },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "File must be 10MB or smaller." }, { status: 400 });
      }
      fileId = await savePrivateUpload(file, "paper-submissions");
    }

    const createData = {
      conferenceId: ctx.conference.id,
      userId: session.user.id,
      title,
      abstract: abstract || null,
      status: "SUBMITTED",
      submittedAt: new Date(),
      activityLog: [{ at: new Date().toISOString(), type: "initial_submit", by: session.user.id }],
    };

    let row;
    try {
      row = await prisma.paperSubmission.create({
        data: {
          ...createData,
          fileId,
          fileUrl: fileId,
        },
      });
    } catch {
      row = await prisma.paperSubmission.create({
        data: {
          ...createData,
          fileUrl: fileId,
        },
      });
    }

    return NextResponse.json({ ok: true, paper: mapPaperForAuthor(row) });
  } catch (err) {
    console.error("Paper submit error:", err);
    return NextResponse.json({ error: "Could not submit paper." }, { status: 500 });
  }
}
