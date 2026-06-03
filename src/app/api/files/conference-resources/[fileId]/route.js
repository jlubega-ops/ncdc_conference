import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { canAccessConferenceMemberContent } from "@/lib/auth/conference-member";
import { resolveConferenceResourceFile } from "@/lib/conference-content/service";
import { guessMimeType, readPrivateFile } from "@/lib/storage/secure-files";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const resolved = await resolveConferenceResourceFile(fileId);
  if (!resolved) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const allowed = await canAccessConferenceMemberContent(session, resolved.conferenceId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buffer = await readPrivateFile("conference-resources", fileId);
    const filename = resolved.fileName || fileId;
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": guessMimeType(fileId),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
