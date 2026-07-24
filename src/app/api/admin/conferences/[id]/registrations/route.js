import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { mapRegistrationForAdmin, userSelect } from "@/lib/conferences/admin-data";

/**
 * Pick the latest lastUsedAt for a registration from matching access keys.
 * @param {Array<{ email: string; userId: string | null; lastUsedAt: Date | null }>} accessKeys
 * @param {{ userId?: string; email?: string }} row
 */
function resolveLastAccessAt(accessKeys, row) {
  const email = row.email?.toLowerCase();
  let latest = null;
  for (const key of accessKeys) {
    if (!key.lastUsedAt) continue;
    const matchesUser = row.userId && key.userId === row.userId;
    const matchesEmail = email && key.email?.toLowerCase() === email;
    if (!matchesUser && !matchesEmail) continue;
    if (!latest || key.lastUsedAt > latest) {
      latest = key.lastUsedAt;
    }
  }
  return latest;
}

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
      select: { email: true, userId: true, lastUsedAt: true },
    }),
  ]);

  const keyEmails = new Set(accessKeys.map((k) => k.email.toLowerCase()));
  const keyUserIds = new Set(accessKeys.map((k) => k.userId).filter(Boolean));

  return NextResponse.json({
    registrations: rows.map((row) => {
      const email = row.user?.email?.toLowerCase();
      const hasAccessKey =
        (email && keyEmails.has(email)) || (row.userId && keyUserIds.has(row.userId));
      const lastAccessAt = resolveLastAccessAt(accessKeys, {
        userId: row.userId,
        email,
      });
      return mapRegistrationForAdmin(row, {
        hasAccessKey: Boolean(hasAccessKey),
        lastAccessAt,
      });
    }),
  });
}
