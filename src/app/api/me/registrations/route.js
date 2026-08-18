import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { jsonNoStore } from "@/lib/http/no-store";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.conferenceRegistration.findMany({
    where: { userId: session.user.id },
    include: {
      conference: {
        select: {
          id: true,
          slug: true,
          title: true,
          startDate: true,
          endDate: true,
          cardImage: true,
          lifecycleStatus: true,
        },
      },
    },
    orderBy: { registeredAt: "desc" },
  });

  return jsonNoStore({
    registrations: rows.map((row) => ({
      id: row.id,
      status: row.status,
      paymentStatus: row.paymentStatus,
      adminNotes: row.adminNotes,
      improvementRequest: row.improvementRequest,
      registeredAt: row.registeredAt,
      reviewedAt: row.reviewedAt,
      conference: row.conference,
      formData: row.formData,
    })),
  });
}
