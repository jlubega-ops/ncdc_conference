import { prisma } from "@/lib/prisma";
import { getManagedConferenceIds } from "@/lib/auth/conference-access";
import { mapConferenceForUi } from "@/lib/conferences/service";
import { getProfileFromUser } from "@/lib/users/profile";
import { PAPER_STATUS_LABELS } from "@/lib/papers/constants";

const REG_STATUS_LABELS = {
  PENDING: "Pending approval",
  NEEDS_REVISION: "Action required",
  CONFIRMED: "Approved",
  CANCELLED: "Cancelled",
};

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 */
function greetingName(session) {
  const profile = getProfileFromUser({ profileData: session.user.profileData, name: session.user.name });
  if (profile.firstName) return profile.firstName;
  if (session.user.name) return session.user.name.split(" ")[0];
  return null;
}

/**
 * @param {string[]} conferenceIds
 */
async function registrationCounts(conferenceIds) {
  if (!conferenceIds.length) {
    return { total: 0, pending: 0, needsRevision: 0, confirmed: 0 };
  }
  const rows = await prisma.conferenceRegistration.groupBy({
    by: ["status"],
    where: { conferenceId: { in: conferenceIds } },
    _count: { _all: true },
  });
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  const pending = byStatus.PENDING ?? 0;
  const needsRevision = byStatus.NEEDS_REVISION ?? 0;
  const confirmed = byStatus.CONFIRMED ?? 0;
  return {
    total: pending + needsRevision + confirmed + (byStatus.CANCELLED ?? 0),
    pending,
    needsRevision,
    confirmed,
  };
}

/**
 * @param {string[]} conferenceIds
 */
async function submissionCounts(conferenceIds) {
  if (!conferenceIds.length) {
    return { total: 0, pendingReview: 0, needsRevision: 0 };
  }
  const rows = await prisma.paperSubmission.groupBy({
    by: ["status"],
    where: { conferenceId: { in: conferenceIds } },
    _count: { _all: true },
  });
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  const pendingReview =
    (byStatus.SUBMITTED ?? 0) + (byStatus.UNDER_REVIEW ?? 0);
  return {
    total: rows.reduce((n, r) => n + r._count._all, 0),
    pendingReview,
    needsRevision: byStatus.NEEDS_REVISION ?? 0,
    accepted: byStatus.ACCEPTED ?? 0,
  };
}

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 */
async function buildSuperadminOverview(session) {
  const [published, draft, usersTotal, usersPending, regPending, subPending, conferences] =
    await Promise.all([
      prisma.conference.count({ where: { publicationStatus: "PUBLISHED" } }),
      prisma.conference.count({ where: { publicationStatus: "DRAFT" } }),
      prisma.user.count(),
      prisma.user.count({ where: { mustChangePassword: true } }),
      prisma.conferenceRegistration.count({ where: { status: "PENDING" } }),
      prisma.paperSubmission.count({
        where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      }),
      prisma.conference.findMany({
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          slug: true,
          title: true,
          publicationStatus: true,
          cardImage: true,
          _count: {
            select: {
              registrations: { where: { status: "PENDING" } },
            },
          },
        },
      }),
    ]);

  const attention = conferences
    .filter((c) => c._count.registrations > 0)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      cardImage: c.cardImage,
      pendingRegistrations: c._count.registrations,
      href: `/dashboard/manage/${c.id}?tab=registrations`,
    }));

  return {
    role: "SUPERADMIN",
    greeting: greetingName(session),
    subtitle: "Manage conferences, users, and activity across the NCDC platform.",
    stats: [
      { label: "Published conferences", value: published, icon: "calendar" },
      { label: "Draft conferences", value: draft, icon: "clock" },
      { label: "Platform users", value: usersTotal, icon: "users" },
      {
        label: "Pending activations",
        value: usersPending,
        icon: "clock",
        highlight: usersPending > 0 ? "warning" : undefined,
      },
      {
        label: "Registrations to review",
        value: regPending,
        icon: "usercheck",
        highlight: regPending > 0 ? "primary" : undefined,
      },
      {
        label: "Papers awaiting review",
        value: subPending,
        icon: "file",
        highlight: subPending > 0 ? "primary" : undefined,
      },
    ],
    alerts: [
      ...(usersPending > 0
        ? [
            {
              type: "info",
              title: `${usersPending} user${usersPending === 1 ? "" : "s"} pending account activation`,
              href: "/dashboard/users",
            },
          ]
        : []),
      ...(regPending > 0
        ? [
            {
              type: "warning",
              title: `${regPending} registration${regPending === 1 ? "" : "s"} awaiting approval`,
              href: "/dashboard/registrations",
            },
          ]
        : []),
    ],
    attention,
    registrations: { pending: regPending },
    papers: { pendingReview: subPending },
  };
}

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 */
async function buildConferenceAdminOverview(session) {
  const managedIds = getManagedConferenceIds(session) ?? [];
  const conferences =
    managedIds.length || session.activeRole === "SUPERADMIN"
      ? await prisma.conference.findMany({
          where:
            session.activeRole === "SUPERADMIN"
              ? {}
              : { id: { in: managedIds } },
          orderBy: { startDate: "desc" },
          take: 12,
        })
      : [];

  const ids = conferences.map((c) => c.id);
  const [regs, subs, feedbackCount] = await Promise.all([
    registrationCounts(ids),
    submissionCounts(ids),
    ids.length
      ? prisma.conferenceFeedback.count({ where: { conferenceId: { in: ids } } })
      : 0,
  ]);

  const conferenceCards = await Promise.all(
    conferences.map(async (row) => {
      const mapped = mapConferenceForUi(row);
      const [pendingReg, pendingSub] = await Promise.all([
        prisma.conferenceRegistration.count({
          where: { conferenceId: row.id, status: "PENDING" },
        }),
        prisma.paperSubmission.count({
          where: {
            conferenceId: row.id,
            status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
          },
        }),
      ]);
      return {
        id: mapped.id,
        slug: mapped.slug,
        title: mapped.title,
        cardImage: mapped.cardImage,
        dateRange: mapped.dateRange,
        publicationStatus: mapped.publicationStatus,
        pendingRegistrations: pendingReg,
        pendingSubmissions: pendingSub,
        href: `/dashboard/manage/${mapped.id}`,
      };
    }),
  );

  const attention = conferenceCards
    .filter((c) => c.pendingRegistrations > 0 || c.pendingSubmissions > 0)
    .slice(0, 5);

  return {
    role: "CONFERENCE_ADMIN",
    greeting: greetingName(session),
    subtitle:
      conferences.length === 0
        ? "No conferences assigned yet. Contact a super admin for access."
        : conferences.length === 1
          ? `Managing ${conferences[0].title}.`
          : `Managing ${conferences.length} conferences.`,
    stats: [
      { label: "My conferences", value: conferences.length, icon: "calendar" },
      {
        label: "Registrations pending",
        value: regs.pending,
        icon: "usercheck",
        highlight: regs.pending > 0 ? "primary" : undefined,
      },
      {
        label: "Papers to review",
        value: subs.pendingReview,
        icon: "file",
        highlight: subs.pendingReview > 0 ? "primary" : undefined,
      },
      { label: "Evaluations received", value: feedbackCount, icon: "message" },
    ],
    alerts: [
      ...(regs.needsRevision > 0
        ? [
            {
              type: "warning",
              title: `${regs.needsRevision} registration${regs.needsRevision === 1 ? "" : "s"} need applicant action`,
              href: "/dashboard/registrations",
            },
          ]
        : []),
      ...(regs.pending > 0
        ? [
            {
              type: "warning",
              title: `${regs.pending} registration${regs.pending === 1 ? "" : "s"} awaiting your approval`,
              href: "/dashboard/registrations",
            },
          ]
        : []),
    ],
    conferences: conferenceCards,
    attention,
    registrations: regs,
    papers: subs,
  };
}

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 */
async function buildReviewerOverview(session) {
  const userId = session.user.id;

  const [assigned, statusCounts] = await Promise.all([
    prisma.paperSubmission.findMany({
      where: { assignedReviewerId: userId },
      include: {
        conference: { select: { id: true, title: true, slug: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.paperSubmission.groupBy({
    by: ["status"],
      where: { assignedReviewerId: userId },
      _count: { _all: true },
    }),
  ]);
  const byStatus = Object.fromEntries(statusCounts.map((r) => [r.status, r._count._all]));
  const assignedTotal = statusCounts.reduce((n, r) => n + r._count._all, 0);
  const awaiting =
    (byStatus.SUBMITTED ?? 0) + (byStatus.UNDER_REVIEW ?? 0) + (byStatus.NEEDS_REVISION ?? 0);
  const completed = (byStatus.ACCEPTED ?? 0) + (byStatus.REJECTED ?? 0);

  const queue = assigned.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    statusLabel: PAPER_STATUS_LABELS[row.status] ?? row.status,
    conferenceTitle: row.conference.title,
    authorName: row.user.name || row.user.email,
    href: "/dashboard/reviewer/papers",
  }));

  return {
    role: "REVIEWER",
    greeting: greetingName(session),
    subtitle: "Review papers assigned to you across your conferences.",
    stats: [
      { label: "Assigned papers", value: assignedTotal, icon: "file" },
      {
        label: "Awaiting your review",
        value: awaiting,
        icon: "clipboard",
        highlight: awaiting > 0 ? "primary" : undefined,
      },
      { label: "Completed reviews", value: completed, icon: "check" },
    ],
    alerts:
      awaiting > 0
        ? [
            {
              type: "primary",
              title: `${awaiting} paper${awaiting === 1 ? "" : "s"} need your attention`,
              href: "/dashboard/reviewer/papers",
            },
          ]
        : [],
    queue,
    papers: { awaiting, completed },
  };
}

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 */
async function buildAttendeeOverview(session) {
  const userId = session.user.id;

  const registrations = await prisma.conferenceRegistration.findMany({
    where: { userId },
    include: { conference: true },
    orderBy: { registeredAt: "desc" },
  });

  const papers = await prisma.paperSubmission.findMany({
    where: { userId },
    select: { id: true, status: true, conferenceId: true },
  });

  const regCards = registrations.map((row) => {
    const mapped = mapConferenceForUi(row.conference);
    const paperCount = papers.filter((p) => p.conferenceId === row.conferenceId).length;
    return {
      id: row.id,
      status: row.status,
      statusLabel: REG_STATUS_LABELS[row.status] ?? row.status,
      improvementRequest: row.improvementRequest,
      conference: {
        id: mapped.id,
        slug: mapped.slug,
        title: mapped.title,
        cardImage: mapped.cardImage,
        dateRange: mapped.dateRange,
      },
      paperCount,
      href: `/dashboard/my-registrations/${mapped.slug}`,
    };
  });

  const needsAction = regCards.filter(
    (r) => r.status === "NEEDS_REVISION" || r.status === "PENDING",
  );
  const confirmed = regCards.filter((r) => r.status === "CONFIRMED").length;

  const alerts = [];
  if (session.user.mustChangePassword) {
    alerts.push({
      type: "warning",
      title: "Set your password before continuing",
      href: "/dashboard/profile?tab=password",
    });
  }
  for (const reg of regCards.filter((r) => r.status === "NEEDS_REVISION")) {
    alerts.push({
      type: "warning",
      title: `Action required: ${reg.conference.title}`,
      body: reg.improvementRequest,
      href: reg.href,
    });
  }
  for (const reg of regCards.filter((r) => r.status === "PENDING").slice(0, 2)) {
    alerts.push({
      type: "info",
      title: `Registration pending: ${reg.conference.title}`,
      href: reg.href,
    });
  }

  const primary = regCards[0];

  return {
    role: "ATTENDEE",
    greeting: greetingName(session),
    subtitle:
      regCards.length === 0
        ? "Browse conferences and register to join an event."
        : regCards.length === 1
          ? `Your conference hub for ${regCards[0].conference.title}.`
          : `You are registered for ${regCards.length} conferences.`,
    stats: [
      { label: "My registrations", value: regCards.length, icon: "users" },
      {
        label: "Approved",
        value: confirmed,
        icon: "check",
        highlight: confirmed > 0 ? "primary" : undefined,
      },
      { label: "My papers", value: papers.length, icon: "file" },
      {
        label: "Needs attention",
        value: needsAction.length,
        icon: "clock",
        highlight: needsAction.length > 0 ? "warning" : undefined,
      },
    ],
    alerts,
    registrations: regCards,
    primaryConference: primary ?? null,
    papers: { total: papers.length },
  };
}

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 */
export async function getDashboardOverview(session) {
  if (!session) return null;

  switch (session.activeRole) {
    case "SUPERADMIN":
      return buildSuperadminOverview(session);
    case "CONFERENCE_ADMIN":
      return buildConferenceAdminOverview(session);
    case "REVIEWER":
      return buildReviewerOverview(session);
    case "ATTENDEE":
      return buildAttendeeOverview(session);
    default:
      return {
        role: session.activeRole,
        greeting: greetingName(session),
        subtitle: "Welcome to your dashboard.",
        stats: [],
        alerts: [],
      };
  }
}
