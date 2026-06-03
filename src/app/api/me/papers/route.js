import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { mapPaperForAuthor } from "@/lib/papers/map";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.paperSubmission.findMany({
    where: { userId: session.user.id },
    include: {
      conference: {
        select: { id: true, slug: true, title: true },
      },
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    papers: rows.map(mapPaperForAuthor),
  });
}
