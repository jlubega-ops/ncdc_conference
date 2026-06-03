import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireConferenceAccess, requireSuperadmin } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { mapConferenceAdminForUi, userSelect } from "@/lib/conferences/admin-data";

export async function GET(_request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.userRole.findMany({
    where: { conferenceId: id, role: "CONFERENCE_ADMIN" },
    include: { user: { select: userSelect } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    admins: rows.map(mapConferenceAdminForUi),
  });
}

export async function POST(request, { params }) {
  const { id: conferenceId } = await params;
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json({ error: "Only superadmins can assign conference admins." }, { status: 403 });
  }

  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { id: true },
  });
  if (!conference) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }

  try {
    const body = await request.json();
    let userId = body.userId?.trim();

    if (body.mode === "new") {
      const email = (body.email ?? "").trim().toLowerCase();
      const name = (body.name ?? "").trim() || null;
      const password = body.password ?? "";

      if (!email) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
      }
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        userId = existing.id;
        if (!existing.passwordHash) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { passwordHash: await hashPassword(password), name: name ?? existing.name },
          });
        }
      } else {
        const created = await prisma.user.create({
          data: {
            email,
            name,
            passwordHash: await hashPassword(password),
          },
        });
        userId = created.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "User is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await prisma.userRole.upsert({
      where: {
        userId_role_conferenceId: {
          userId,
          role: "CONFERENCE_ADMIN",
          conferenceId,
        },
      },
      create: {
        userId,
        role: "CONFERENCE_ADMIN",
        conferenceId,
      },
      update: {},
    });

    const rows = await prisma.userRole.findMany({
      where: { conferenceId, role: "CONFERENCE_ADMIN" },
      include: { user: { select: userSelect } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      admins: rows.map(mapConferenceAdminForUi),
      message: "Conference admin assigned successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not assign conference admin.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id: conferenceId } = await params;
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json({ error: "Only superadmins can remove conference admins." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  await prisma.userRole.deleteMany({
    where: {
      userId,
      conferenceId,
      role: "CONFERENCE_ADMIN",
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Conference admin removed.",
  });
}
