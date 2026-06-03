import { prisma } from "@/lib/prisma";
import { countAttendanceMarks, groupAttendanceByUser } from "@/lib/attendance/db";
import {
  aggregateFeedback,
  aggregatePapers,
  aggregateRegistrations,
  buildRegistrationTrend,
} from "@/lib/reports/aggregate";
import { resolveReportConferenceIds } from "@/lib/reports/access";

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 * @param {{ conferenceId?: string; period?: string; registrationStatus?: string }} filters
 */
export async function buildReport(session, filters = {}) {
  const period = filters.period ?? "all";
  const periodDays = period === "7" ? 7 : period === "30" ? 30 : 0;
  const registrationStatus = filters.registrationStatus ?? "all";

  const { ids: conferenceIds, options } = await resolveReportConferenceIds(
    session,
    filters.conferenceId ?? "all",
  );

  const role = session.activeRole;
  const isReviewer = role === "REVIEWER";
  const conferenceFilter = conferenceIds.length ? { conferenceId: { in: conferenceIds } } : { conferenceId: "none" };

  if (!conferenceIds.length) {
    return {
      role,
      filters: { conferenceId: "all", period, registrationStatus },
      conferences: options,
      summary: [],
      sections: { registrations: false, papers: false, feedback: false, attendance: false, reviewer: isReviewer },
      registrations: null,
      papers: null,
      feedback: null,
      attendance: null,
      reviewer: isReviewer ? { assigned: 0, byStatus: [], reviewedByYou: 0, conferences: 0 } : null,
    };
  }

  const periodCutoff =
    periodDays > 0 ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) : null;

  if (isReviewer) {
    return buildReviewerReport(session, conferenceIds, options, filters);
  }

  const [registrations, papers, feedback, attendanceRows, conferenceCount] = await Promise.all([
    prisma.conferenceRegistration.findMany({
      where: conferenceFilter,
      select: {
        status: true,
        formData: true,
        registeredAt: true,
        paymentStatus: true,
      },
    }),
    prisma.paperSubmission.findMany({
      where: conferenceFilter,
      select: {
        status: true,
        isFinalApproved: true,
        submittedAt: true,
      },
    }),
    prisma.conferenceFeedback.findMany({
      where: conferenceFilter,
      select: { rating: true, createdAt: true },
    }),
    groupAttendanceByUser({ conferenceId: { in: conferenceIds } }),
    prisma.conference.count({ where: { id: { in: conferenceIds } } }),
  ]);

  const attendanceTotal = await countAttendanceMarks({
    conferenceId: { in: conferenceIds },
  });

  const regAgg = aggregateRegistrations(registrations, { statusFilter: registrationStatus });
  if (periodDays > 0) {
    regAgg.trend = buildRegistrationTrend(
      registrations.filter((r) => {
        if (registrationStatus !== "all" && r.status !== registrationStatus) return false;
        return new Date(r.registeredAt) >= periodCutoff;
      }),
      periodDays,
    );
  }

  const papersAgg = aggregatePapers(papers);
  const feedbackAgg = aggregateFeedback(feedback);

  const confirmed = registrations.filter((r) => r.status === "CONFIRMED").length;
  const pending = registrations.filter((r) => r.status === "PENDING").length;

  const selectedTitle =
    filters.conferenceId && filters.conferenceId !== "all"
      ? options.find((c) => c.id === filters.conferenceId)?.title
      : conferenceIds.length === 1
        ? options[0]?.title
        : `All conferences (${conferenceIds.length})`;

  return {
    role,
    filters: {
      conferenceId: filters.conferenceId ?? "all",
      period,
      registrationStatus,
    },
    conferenceTitle: selectedTitle,
    conferences: options,
    summary: [
      { label: "Conferences in scope", value: conferenceCount, icon: "calendar" },
      { label: "Total registrations", value: registrations.length, icon: "users" },
      { label: "Approved attendees", value: confirmed, icon: "check" },
      { label: "Pending applications", value: pending, icon: "clock" },
      { label: "Paper submissions", value: papers.length, icon: "file" },
      { label: "Evaluations received", value: feedback.length, icon: "message" },
      { label: "Attendance check-ins", value: attendanceTotal, icon: "clipboard" },
      {
        label: "Unique attendees marked",
        value: attendanceRows.length,
        icon: "usercheck",
      },
    ],
    sections: {
      registrations: true,
      papers: true,
      feedback: true,
      attendance: true,
      reviewer: false,
    },
    registrations: regAgg,
    papers: papersAgg,
    feedback: feedbackAgg,
    attendance: {
      totalCheckIns: attendanceTotal,
      uniqueAttendees: attendanceRows.length,
    },
    reviewer: null,
  };
}

/**
 * @param {any} session
 * @param {string[]} conferenceIds
 * @param {any[]} options
 * @param {any} filters
 */
async function buildReviewerReport(session, conferenceIds, options, filters) {
  const conferenceFilter = { conferenceId: { in: conferenceIds } };

  const [assignedPapers, reviewedCount, feedback] = await Promise.all([
    prisma.paperSubmission.findMany({
      where: {
        ...conferenceFilter,
        assignedReviewerId: session.user.id,
      },
      select: {
        status: true,
        isFinalApproved: true,
        conferenceId: true,
        submittedAt: true,
      },
    }),
    prisma.paperSubmission.count({
      where: {
        ...conferenceFilter,
        reviewedById: session.user.id,
      },
    }),
    prisma.conferenceFeedback.findMany({
      where: conferenceFilter,
      select: { rating: true },
    }),
  ]);

  const papersAgg = aggregatePapers(assignedPapers);
  const feedbackAgg = aggregateFeedback(feedback);

  const needsAction = assignedPapers.filter(
    (p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW" || p.status === "NEEDS_REVISION",
  ).length;

  const selectedTitle =
    filters.conferenceId && filters.conferenceId !== "all"
      ? options.find((c) => c.id === filters.conferenceId)?.title
      : `All assigned conferences (${conferenceIds.length})`;

  return {
    role: "REVIEWER",
    filters: {
      conferenceId: filters.conferenceId ?? "all",
      period: filters.period ?? "all",
      registrationStatus: "all",
    },
    conferenceTitle: selectedTitle,
    conferences: options,
    summary: [
      { label: "Conferences", value: conferenceIds.length, icon: "calendar" },
      { label: "Papers assigned to you", value: assignedPapers.length, icon: "file" },
      { label: "Awaiting your review", value: needsAction, icon: "clock" },
      { label: "Reviews you completed", value: reviewedCount, icon: "check" },
      { label: "Final approvals", value: papersAgg.finalApproved, icon: "award" },
      { label: "Conference evaluations", value: feedback.length, icon: "message" },
    ],
    sections: {
      registrations: false,
      papers: true,
      feedback: true,
      attendance: false,
      reviewer: true,
    },
    registrations: null,
    papers: papersAgg,
    feedback: feedbackAgg,
    attendance: null,
    reviewer: {
      assigned: assignedPapers.length,
      reviewedByYou: reviewedCount,
      needsAction,
      byStatus: papersAgg.byStatus,
    },
  };
}
