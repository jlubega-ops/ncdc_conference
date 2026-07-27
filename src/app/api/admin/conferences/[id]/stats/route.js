import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeConferenceAccess } from "@/lib/auth/guards";

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  const [registrations, submissions, feedback, admins] = await Promise.all([
    prisma.conferenceRegistration.groupBy({
      by: ["status"],
      where: { conferenceId: id },
      _count: { _all: true },
    }),
    prisma.paperSubmission.groupBy({
      by: ["status"],
      where: { conferenceId: id },
      _count: { _all: true },
    }),
    prisma.conferenceFeedback.count({ where: { conferenceId: id } }),
    prisma.userRole.count({
      where: { conferenceId: id, role: "CONFERENCE_ADMIN" },
    }),
  ]);

  const regByStatus = Object.fromEntries(
    registrations.map((r) => [r.status, r._count._all]),
  );
  const regTotal = registrations.reduce((n, r) => n + r._count._all, 0);

  const subByStatus = Object.fromEntries(
    submissions.map((s) => [s.status, s._count._all]),
  );
  const subTotal = submissions.reduce((n, s) => n + s._count._all, 0);

  return NextResponse.json({
    registrations: {
      total: regTotal,
      pending: regByStatus.PENDING ?? 0,
      needsRevision: regByStatus.NEEDS_REVISION ?? 0,
      confirmed: regByStatus.CONFIRMED ?? 0,
      cancelled: regByStatus.CANCELLED ?? 0,
    },
    submissions: {
      total: subTotal,
      byStatus: subByStatus,
    },
    feedback: { total: feedback },
    admins: { total: admins },
  });
}
