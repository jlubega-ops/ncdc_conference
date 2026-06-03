import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/auth/guards";

export async function GET(request) {
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q } },
        { name: { contains: q } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
    take: 10,
    orderBy: { email: "asc" },
  });

  return NextResponse.json({ users });
}
