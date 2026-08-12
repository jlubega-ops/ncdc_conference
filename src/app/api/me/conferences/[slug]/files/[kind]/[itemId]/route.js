import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { canAccessConferenceMemberContent } from "@/lib/auth/conference-member";
import { prisma } from "@/lib/prisma";
import { resolveMemberContentFile } from "@/lib/conference-content/service";
import { guessMimeType, readPrivateFile } from "@/lib/storage/secure-files";

export const runtime = "nodejs";

/**
 * Protected member file access by content id (not raw storage fileId).
 * GET /api/me/conferences/[slug]/files/[kind]/[itemId]?mode=preview|download
 */
export async function GET(request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, kind, itemId } = await params;
  const normalizedKind = String(kind || "").toLowerCase();
  if (normalizedKind !== "resource" && normalizedKind !== "presentation") {
    return NextResponse.json({ error: "Invalid file kind." }, { status: 400 });
  }

  const conference = await prisma.conference.findFirst({
    where: { slug },
    select: { id: true },
  });
  if (!conference) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }

  const allowed = await canAccessConferenceMemberContent(session, conference.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolved = await resolveMemberContentFile(conference.id, normalizedKind, itemId);
  if (!resolved) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const mode = new URL(request.url).searchParams.get("mode") === "download" ? "download" : "preview";
  const filename = resolved.fileName || resolved.fileId;
  const safeName = String(filename).replace(/"/g, "");

  try {
    const buffer = await readPrivateFile("conference-resources", resolved.fileId);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": guessMimeType(resolved.fileId),
        "Content-Disposition":
          mode === "download"
            ? `attachment; filename="${safeName}"`
            : `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
