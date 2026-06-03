import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireReviewer } from "@/lib/auth/guards";
import { mapPaperForAdmin } from "@/lib/papers/map";

const userSelect = {
  id: true,
  email: true,
  name: true,
  mustChangePassword: true,
};

export async function GET() {
  const session = await requireReviewer();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.paperSubmission.findMany({
    where: { assignedReviewerId: session.user.id },
    include: {
      user: { select: userSelect },
      conference: { select: { id: true, slug: true, title: true } },
      assignedReviewer: { select: userSelect },
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    papers: rows.map((row) => ({
      ...mapPaperForAdmin(row),
      conference: row.conference,
    })),
  });
}
