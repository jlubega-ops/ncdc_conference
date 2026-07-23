import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { mapRegistrationForAdmin, userSelect } from "@/lib/conferences/admin-data";

export async function GET(_request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rows, accessKeys] = await Promise.all([
    prisma.conferenceRegistration.findMany({
      where: { conferenceId: id },
      include: { user: { select: userSelect } },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.conferenceAccessKey.findMany({
      where: { conferenceId: id, revokedAt: null },
      select: { email: true, userId: true },
    }),
  ]);

  const keyEmails = new Set(accessKeys.map((k) => k.email.toLowerCase()));
  const keyUserIds = new Set(accessKeys.map((k) => k.userId).filter(Boolean));

  return NextResponse.json({
    registrations: rows.map((row) => {
      const email = row.user?.email?.toLowerCase();
      const hasAccessKey =
        (email && keyEmails.has(email)) || (row.userId && keyUserIds.has(row.userId));
      return mapRegistrationForAdmin(row, { hasAccessKey: Boolean(hasAccessKey) });
    }),
  });
}
