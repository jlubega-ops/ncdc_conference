import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeConferenceManager } from "@/lib/auth/guards";

export async function GET(request) {
  const access = await authorizeConferenceManager();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 3) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q } },
        { name: { contains: q } },
      ],
      roles: {
        some: {
          role: { in: ["REVIEWER", "CONFERENCE_ADMIN", "SUPERADMIN"] },
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
    take: 8,
    orderBy: { email: "asc" },
  });

  return NextResponse.json({ users });
}
