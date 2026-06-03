import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { canManageConference } from "@/lib/auth/conference-access";
import { guessMimeType, readPrivateFile } from "@/lib/storage/secure-files";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  const registration = await prisma.conferenceRegistration.findFirst({
    where: { paymentProofFileId: fileId },
    include: { conference: { select: { id: true } } },
  });

  if (!registration) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const isOwner = registration.userId === session.user.id;
  const isAdmin = canManageConference(session, registration.conference.id);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buffer = await readPrivateFile("payment-proofs", fileId);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": guessMimeType(fileId),
        "Content-Disposition": `inline; filename="${fileId}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
