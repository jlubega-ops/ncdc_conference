import { prisma } from "@/lib/prisma";
import {
  countAttendanceMarks,
  findAttendanceMarks,
  groupAttendanceByUser,
} from "@/lib/attendance/db";
import {
  conferenceAllowsPaperSubmissions,
  conferenceHasAttendance,
  conferenceHasFeedback,
  conferenceHasGifts,
  conferenceManagesRegistrations,
} from "@/lib/conferences/feature-visibility";
import { normalizeBreakoutRooms, normalizeOnlineStream } from "@/lib/conferences/utils";
import {
  aggregateAttendanceByDay,
  aggregateCertificates,
  aggregateFeedback,
  aggregateGifts,
  aggregateOnlineConfig,
  aggregatePapers,
  aggregateRegistrationModes,
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
  const conferenceFilter = conferenceIds.length
    ? { conferenceId: { in: conferenceIds } }
    : { conferenceId: "none" };

  if (!conferenceIds.length) {
    return emptyReport(role, options, filters, isReviewer);
  }

  const periodCutoff =
    periodDays > 0 ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) : null;

  if (isReviewer) {
    return buildReviewerReport(session, conferenceIds, options, filters);
  }

  const conferences = await prisma.conference.findMany({
    where: { id: { in: conferenceIds } },
    select: {
      id: true,
      title: true,
      registrationMode: true,
      allowPaperSubmissions: true,
      conferenceDays: true,
      giftsSettings: true,
      onlineStream: true,
      breakoutRooms: true,
      publicationStatus: true,
    },
  });

  const showRegistrations = conferences.some(conferenceManagesRegistrations);
  const showPapers = conferences.some(conferenceAllowsPaperSubmissions);
  const showFeedback = conferences.some(conferenceHasFeedback);
  const showAttendance = conferences.some(conferenceHasAttendance);
  const showGifts = conferences.some(conferenceHasGifts);
  const showOnline =
    conferences.some((c) => normalizeOnlineStream(c.onlineStream).length > 0) ||
    conferences.some((c) => {
      const rooms = normalizeBreakoutRooms(c.breakoutRooms);
      return rooms.allowed && rooms.rooms.length > 0;
    });

  const paperConferenceIds = conferences
    .filter(conferenceAllowsPaperSubmissions)
    .map((c) => c.id);
  const registrationConferenceIds = conferences
    .filter(conferenceManagesRegistrations)
    .map((c) => c.id);
  const giftConferenceIds = conferences.filter(conferenceHasGifts).map((c) => c.id);

  const [
    registrations,
    papers,
    feedback,
    attendanceRows,
    attendanceMarks,
    certificates,
    giftIssuances,
  ] = await Promise.all([
    showRegistrations
      ? prisma.conferenceRegistration.findMany({
          where: { conferenceId: { in: registrationConferenceIds } },
          select: {
            status: true,
            formData: true,
            registeredAt: true,
            paymentStatus: true,
          },
        })
      : Promise.resolve([]),
    showPapers
      ? prisma.paperSubmission.findMany({
          where: { conferenceId: { in: paperConferenceIds } },
          select: {
            status: true,
            isFinalApproved: true,
            submittedAt: true,
          },
        })
      : Promise.resolve([]),
    showFeedback
      ? prisma.conferenceFeedback.findMany({
          where: conferenceFilter,
          select: { rating: true, createdAt: true, feedbackType: true },
        })
      : Promise.resolve([]),
    showAttendance
      ? groupAttendanceByUser({ conferenceId: { in: conferenceIds } })
      : Promise.resolve([]),
    showAttendance
      ? findAttendanceMarks(
          { conferenceId: { in: conferenceIds } },
          { select: { dayDate: true } },
        )
      : Promise.resolve([]),
    showAttendance
      ? prisma.conferenceCertificate.findMany({
          where: conferenceFilter,
          select: { emailedAt: true },
        })
      : Promise.resolve([]),
    showGifts
      ? prisma.conferenceGiftIssuance.findMany({
          where: { conferenceId: { in: giftConferenceIds } },
          select: { conferenceId: true, category: true, items: true },
        })
      : Promise.resolve([]),
  ]);

  const attendanceTotal = showAttendance
    ? await countAttendanceMarks({ conferenceId: { in: conferenceIds } })
    : 0;

  const regAgg = showRegistrations
    ? aggregateRegistrations(registrations, { statusFilter: registrationStatus })
    : null;
  if (regAgg && periodDays > 0) {
    regAgg.trend = buildRegistrationTrend(
      registrations.filter((r) => {
        if (registrationStatus !== "all" && r.status !== registrationStatus) return false;
        return new Date(r.registeredAt) >= periodCutoff;
      }),
      periodDays,
    );
  }

  const papersAgg = showPapers ? aggregatePapers(papers) : null;
  const feedbackAgg = showFeedback ? aggregateFeedback(feedback) : null;
  const giftsAgg = showGifts ? aggregateGifts(conferences, giftIssuances) : null;
  const onlineAgg = showOnline ? aggregateOnlineConfig(conferences) : null;
  const registrationModes = aggregateRegistrationModes(conferences);
  const certificatesAgg = showAttendance ? aggregateCertificates(certificates) : null;
  const attendanceByDay = showAttendance ? aggregateAttendanceByDay(attendanceMarks) : [];

  const confirmed = registrations.filter((r) => r.status === "CONFIRMED").length;
  const pending = registrations.filter((r) => r.status === "PENDING").length;

  const selectedTitle =
    filters.conferenceId && filters.conferenceId !== "all"
      ? options.find((c) => c.id === filters.conferenceId)?.title
      : conferenceIds.length === 1
        ? options[0]?.title
        : `All conferences (${conferenceIds.length})`;

  /** @type {Array<{ label: string; value: number; icon: string }>} */
  const summary = [
    { label: "Conferences in scope", value: conferences.length, icon: "calendar" },
  ];
  if (showRegistrations) {
    summary.push(
      { label: "Total registrations", value: registrations.length, icon: "users" },
      { label: "Approved attendees", value: confirmed, icon: "check" },
      { label: "Pending applications", value: pending, icon: "clock" },
    );
  }
  if (showPapers) {
    summary.push({ label: "Paper submissions", value: papers.length, icon: "file" });
  }
  if (showFeedback) {
    summary.push({ label: "Evaluations received", value: feedback.length, icon: "message" });
  }
  if (showAttendance) {
    summary.push(
      { label: "Attendance check-ins", value: attendanceTotal, icon: "clipboard" },
      { label: "Unique attendees marked", value: attendanceRows.length, icon: "usercheck" },
      { label: "Certificates issued", value: certificatesAgg?.issued ?? 0, icon: "award" },
    );
  }
  if (showGifts) {
    summary.push({
      label: "Gift issuances",
      value: giftsAgg?.issuances ?? 0,
      icon: "gift",
    });
  }

  return {
    role,
    filters: {
      conferenceId: filters.conferenceId ?? "all",
      period,
      registrationStatus,
    },
    conferenceTitle: selectedTitle,
    conferences: options,
    summary,
    sections: {
      overview: true,
      registrations: showRegistrations,
      papers: showPapers,
      feedback: showFeedback,
      attendance: showAttendance,
      gifts: showGifts,
      online: showOnline,
      reviewer: false,
    },
    overview: {
      registrationModes,
      published: conferences.filter((c) => c.publicationStatus === "PUBLISHED").length,
      drafts: conferences.filter((c) => c.publicationStatus !== "PUBLISHED").length,
      withPapers: paperConferenceIds.length,
      withGifts: giftConferenceIds.length,
      withStreams: onlineAgg?.withStreams ?? 0,
      withBreakouts: onlineAgg?.withBreakouts ?? 0,
    },
    registrations: regAgg,
    papers: papersAgg,
    feedback: feedbackAgg,
    attendance: showAttendance
      ? {
          totalCheckIns: attendanceTotal,
          uniqueAttendees: attendanceRows.length,
          byDay: attendanceByDay,
          certificates: certificatesAgg,
        }
      : null,
    gifts: giftsAgg,
    online: onlineAgg,
    reviewer: null,
  };
}

function emptyReport(role, options, filters, isReviewer) {
  return {
    role,
    filters: {
      conferenceId: filters.conferenceId ?? "all",
      period: filters.period ?? "all",
      registrationStatus: filters.registrationStatus ?? "all",
    },
    conferences: options,
    summary: [],
    sections: {
      overview: false,
      registrations: false,
      papers: false,
      feedback: false,
      attendance: false,
      gifts: false,
      online: false,
      reviewer: isReviewer,
    },
    overview: null,
    registrations: null,
    papers: null,
    feedback: null,
    attendance: null,
    gifts: null,
    online: null,
    reviewer: isReviewer
      ? { assigned: 0, byStatus: [], reviewedByYou: 0, conferences: 0 }
      : null,
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

  const conferences = await prisma.conference.findMany({
    where: { id: { in: conferenceIds } },
    select: {
      id: true,
      allowPaperSubmissions: true,
      conferenceDays: true,
    },
  });
  const showPapers = conferences.some(conferenceAllowsPaperSubmissions);
  const showFeedback = conferences.some(conferenceHasFeedback);

  const [assignedPapers, reviewedCount, feedback] = await Promise.all([
    showPapers
      ? prisma.paperSubmission.findMany({
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
        })
      : Promise.resolve([]),
    showPapers
      ? prisma.paperSubmission.count({
          where: {
            ...conferenceFilter,
            reviewedById: session.user.id,
          },
        })
      : Promise.resolve(0),
    showFeedback
      ? prisma.conferenceFeedback.findMany({
          where: conferenceFilter,
          select: { rating: true, feedbackType: true },
        })
      : Promise.resolve([]),
  ]);

  const papersAgg = showPapers ? aggregatePapers(assignedPapers) : null;
  const feedbackAgg = showFeedback ? aggregateFeedback(feedback) : null;

  const needsAction = assignedPapers.filter(
    (p) =>
      p.status === "SUBMITTED" ||
      p.status === "UNDER_REVIEW" ||
      p.status === "NEEDS_REVISION",
  ).length;

  const selectedTitle =
    filters.conferenceId && filters.conferenceId !== "all"
      ? options.find((c) => c.id === filters.conferenceId)?.title
      : `All assigned conferences (${conferenceIds.length})`;

  /** @type {Array<{ label: string; value: number; icon: string }>} */
  const summary = [
    { label: "Conferences", value: conferenceIds.length, icon: "calendar" },
  ];
  if (showPapers) {
    summary.push(
      { label: "Papers assigned to you", value: assignedPapers.length, icon: "file" },
      { label: "Awaiting your review", value: needsAction, icon: "clock" },
      { label: "Reviews you completed", value: reviewedCount, icon: "check" },
      { label: "Final approvals", value: papersAgg?.finalApproved ?? 0, icon: "award" },
    );
  }
  if (showFeedback) {
    summary.push({
      label: "Conference evaluations",
      value: feedback.length,
      icon: "message",
    });
  }

  return {
    role: "REVIEWER",
    filters: {
      conferenceId: filters.conferenceId ?? "all",
      period: filters.period ?? "all",
      registrationStatus: "all",
    },
    conferenceTitle: selectedTitle,
    conferences: options,
    summary,
    sections: {
      overview: false,
      registrations: false,
      papers: showPapers,
      feedback: showFeedback,
      attendance: false,
      gifts: false,
      online: false,
      reviewer: showPapers,
    },
    overview: null,
    registrations: null,
    papers: papersAgg,
    feedback: feedbackAgg,
    attendance: null,
    gifts: null,
    online: null,
    reviewer: showPapers
      ? {
          assigned: assignedPapers.length,
          reviewedByYou: reviewedCount,
          needsAction,
          byStatus: papersAgg?.byStatus ?? [],
        }
      : null,
  };
}
