import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeReviewer } from "@/lib/auth/guards";
import { jsonNoStore } from "@/lib/http/no-store";
import { mapPaperForAdmin } from "@/lib/papers/map";

const userSelect = {
  id: true,
  email: true,
  name: true,
  mustChangePassword: true,
};

export async function GET() {
  const access = await authorizeReviewer();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  const rows = await prisma.paperSubmission.findMany({
    where: { assignedReviewerId: session.user.id },
    include: {
      user: { select: userSelect },
      conference: { select: { id: true, slug: true, title: true } },
      assignedReviewer: { select: userSelect },
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
  });

  return jsonNoStore({
    papers: rows.map((row) => ({
      ...mapPaperForAdmin(row),
      conference: row.conference,
    })),
  });
}
