import { prisma } from "@/lib/prisma";
import { normalizeConferenceDays } from "@/lib/attendance/utils";
import { getSpeakersForDate } from "@/lib/conferences/utils";
import {
  FEEDBACK_TYPES,
  LIKERT_LABELS,
  filterSpeakersForFeedback,
  normalizeFeedbackSettings,
  parseSpeakerFeedbackTargetKey,
} from "@/lib/feedback/questions";
import { getProfileFromUser } from "@/lib/users/profile";

/**
 * @param {any} row
 * @param {{ hideIdentity?: boolean }} [opts]
 */
export function mapFeedbackSubmission(row, opts = {}) {
  const anonymous = Boolean(row.isAnonymous);
  const hide = opts.hideIdentity || anonymous;
  const profile = row.user ? getProfileFromUser(row.user) : null;

  return {
    id: row.id,
    feedbackType: row.feedbackType,
    targetKey: row.targetKey,
    answers: row.answers && typeof row.answers === "object" ? row.answers : {},
    rating: row.rating,
    comment: row.comment,
    isAnonymous: anonymous,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: hide
      ? { id: null, name: "Anonymous", email: null, telephone: null }
      : {
          id: row.user?.id ?? null,
          name:
            profile?.fullName ||
            row.user?.name ||
            row.user?.email ||
            "Unknown",
          email: row.user?.email ?? null,
          telephone: profile?.telephone
            ? `${profile.countryCode || ""} ${profile.telephone}`.trim()
            : null,
        },
  };
}

/**
 * Build analytics + submission list for admin feedback tab.
 * @param {string} conferenceId
 */
export async function getConferenceFeedbackReport(conferenceId) {
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
  });
  if (!conference) throw new Error("Conference not found.");

  const settings = normalizeFeedbackSettings(conference.feedbackSettings);
  const days = normalizeConferenceDays(conference.conferenceDays);
  const speakers = Array.isArray(conference.speakers) ? conference.speakers : [];

  const [rows, registrations] = await Promise.all([
    prisma.conferenceFeedback.findMany({
      where: { conferenceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileData: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.conferenceRegistration.findMany({
      where: { conferenceId, status: "CONFIRMED" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileData: true,
          },
        },
      },
      orderBy: { registeredAt: "asc" },
    }),
  ]);

  const submissions = rows.map((row) => mapFeedbackSubmission(row));

  /** @type {Map<string, Set<string>>} */
  const daySubmitters = new Map();
  /** @type {Map<string, number[]>} */
  const questionScores = new Map();
  /** @type {Map<string, { name: string; scores: number[]; byDay: Map<string, number[]> }>} */
  const speakerStats = new Map();

  for (const row of rows) {
    const answers = row.answers && typeof row.answers === "object" ? row.answers : {};
    if (row.feedbackType === FEEDBACK_TYPES.DAY) {
      if (!daySubmitters.has(row.targetKey)) daySubmitters.set(row.targetKey, new Set());
      daySubmitters.get(row.targetKey).add(row.userId);

      for (const [key, value] of Object.entries(answers)) {
        const n = Number(value);
        if (!Number.isFinite(n)) continue;
        const qKey = `day:${key}`;
        if (!questionScores.has(qKey)) questionScores.set(qKey, []);
        questionScores.get(qKey).push(n);
      }
    } else if (row.feedbackType === FEEDBACK_TYPES.SPEAKER) {
      const { dayDate, speakerId } = parseSpeakerFeedbackTargetKey(row.targetKey);
      const speaker =
        speakers.find((s) => s.id === speakerId) ||
        speakers.find((s) => s.id === row.targetKey);
      const name = speaker?.name || "Speaker";
      if (!speakerStats.has(speakerId || row.targetKey)) {
        speakerStats.set(speakerId || row.targetKey, {
          name,
          scores: [],
          byDay: new Map(),
        });
      }
      const entry = speakerStats.get(speakerId || row.targetKey);
      const primary = Number(row.rating ?? Object.values(answers)[0]);
      if (Number.isFinite(primary)) {
        entry.scores.push(primary);
        if (dayDate) {
          if (!entry.byDay.has(dayDate)) entry.byDay.set(dayDate, []);
          entry.byDay.get(dayDate).push(primary);
        }
      }
      for (const [key, value] of Object.entries(answers)) {
        const n = Number(value);
        if (!Number.isFinite(n)) continue;
        const qKey = `speaker:${key}`;
        if (!questionScores.has(qKey)) questionScores.set(qKey, []);
        questionScores.get(qKey).push(n);
      }
    }
  }

  const allRatings = rows
    .map((r) => r.rating)
    .filter((r) => r != null && Number.isFinite(r));
  const overallAvg = allRatings.length
    ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
    : 0;

  const byRating = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of allRatings) {
    if (r >= 1 && r <= 5) byRating[r] += 1;
  }

  const dayReports = days.map((day) => {
    const daySpeakers = filterSpeakersForFeedback(
      getSpeakersForDate(speakers, day.date),
      settings,
    );
    const submitterCount = daySubmitters.get(day.date)?.size ?? 0;
    const dayRows = rows.filter(
      (r) =>
        r.feedbackType === FEEDBACK_TYPES.DAY && r.targetKey === day.date,
    );
    const dayRatings = dayRows
      .map((r) => r.rating)
      .filter((r) => r != null && Number.isFinite(r));
    const avg = dayRatings.length
      ? Math.round((dayRatings.reduce((a, b) => a + b, 0) / dayRatings.length) * 10) / 10
      : 0;

    return {
      date: day.date,
      dayIndex: day.dayIndex,
      startTime: day.startTime,
      endTime: day.endTime,
      submissions: dayRows.length,
      uniqueRespondents: submitterCount,
      avgRating: avg,
      speakers: daySpeakers.map((s) => ({
        id: s.id,
        name: s.name,
        title: s.title,
        speakerType: s.speakerType,
      })),
    };
  });

  const questionReport = [
    ...settings.questions.map((q) => {
      const scores = questionScores.get(`day:${q.id}`) ?? [];
      return {
        scope: "day",
        id: q.id,
        label: q.label,
        responses: scores.length,
        avg:
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : 0,
        distribution: [5, 4, 3, 2, 1].map((n) => ({
          value: n,
          label: LIKERT_LABELS[n],
          count: scores.filter((s) => s === n).length,
        })),
      };
    }),
    ...settings.speakerQuestions.map((q) => {
      const scores = questionScores.get(`speaker:${q.id}`) ?? [];
      return {
        scope: "speaker",
        id: q.id,
        label: q.label,
        responses: scores.length,
        avg:
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : 0,
        distribution: [5, 4, 3, 2, 1].map((n) => ({
          value: n,
          label: LIKERT_LABELS[n],
          count: scores.filter((s) => s === n).length,
        })),
      };
    }),
  ];

  const speakerReport = [...speakerStats.entries()].map(([id, entry]) => ({
    id,
    name: entry.name,
    responses: entry.scores.length,
    avg:
      entry.scores.length > 0
        ? Math.round(
            (entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length) * 10,
          ) / 10
        : 0,
    byDay: [...entry.byDay.entries()].map(([date, scores]) => ({
      date,
      responses: scores.length,
      avg:
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0,
    })),
  }));

  const respondentsWithAny = new Set(rows.map((r) => r.userId));
  const participation = registrations.map((reg) => {
    const profile = getProfileFromUser(reg.user);
    const userDays = days.map((day) => ({
      date: day.date,
      submitted: daySubmitters.get(day.date)?.has(reg.userId) ?? false,
    }));
    const submittedCount = userDays.filter((d) => d.submitted).length;
    return {
      userId: reg.userId,
      name: profile.fullName || reg.user.name || reg.user.email,
      email: reg.user.email,
      telephone: profile.telephone
        ? `${profile.countryCode || ""} ${profile.telephone}`.trim()
        : null,
      hasAnyFeedback: respondentsWithAny.has(reg.userId),
      daysSubmitted: submittedCount,
      daysTotal: days.length,
      days: userDays,
    };
  });

  return {
    conference: {
      id: conference.id,
      title: conference.title,
      slug: conference.slug,
    },
    settings,
    overview: {
      totalSubmissions: rows.length,
      uniqueRespondents: respondentsWithAny.size,
      confirmedAttendees: registrations.length,
      pendingRespondents: Math.max(0, registrations.length - respondentsWithAny.size),
      overallAvg,
      byRating: [5, 4, 3, 2, 1].map((n) => ({
        value: n,
        label: LIKERT_LABELS[n],
        count: byRating[n] ?? 0,
      })),
    },
    days: dayReports,
    questions: questionReport,
    speakers: speakerReport,
    participation,
    submissions,
  };
}

/**
 * Build CSV string for Excel download.
 * @param {Awaited<ReturnType<typeof getConferenceFeedbackReport>>} report
 */
export function feedbackReportToCsv(report) {
  const lines = [];
  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  lines.push("Feedback overview");
  lines.push(["Metric", "Value"].map(esc).join(","));
  lines.push(["Conference", report.conference.title].map(esc).join(","));
  lines.push(["Total submissions", report.overview.totalSubmissions].map(esc).join(","));
  lines.push(["Unique respondents", report.overview.uniqueRespondents].map(esc).join(","));
  lines.push(["Confirmed attendees", report.overview.confirmedAttendees].map(esc).join(","));
  lines.push(["Not yet responded", report.overview.pendingRespondents].map(esc).join(","));
  lines.push(["Overall average", report.overview.overallAvg].map(esc).join(","));
  lines.push("");

  lines.push("Rating distribution");
  lines.push(["Rating", "Label", "Count"].map(esc).join(","));
  for (const row of report.overview.byRating) {
    lines.push([row.value, row.label, row.count].map(esc).join(","));
  }
  lines.push("");

  lines.push("By day");
  lines.push(
    ["Day", "Date", "Submissions", "Respondents", "Average"].map(esc).join(","),
  );
  for (const day of report.days) {
    lines.push(
      [day.dayIndex, day.date, day.submissions, day.uniqueRespondents, day.avgRating]
        .map(esc)
        .join(","),
    );
  }
  lines.push("");

  lines.push("Questions");
  lines.push(["Scope", "Question", "Responses", "Average"].map(esc).join(","));
  for (const q of report.questions) {
    lines.push([q.scope, q.label, q.responses, q.avg].map(esc).join(","));
  }
  lines.push("");

  lines.push("Speakers");
  lines.push(["Speaker", "Responses", "Average"].map(esc).join(","));
  for (const s of report.speakers) {
    lines.push([s.name, s.responses, s.avg].map(esc).join(","));
  }
  lines.push("");

  lines.push("Participation");
  lines.push(
    ["Name", "Email", "Telephone", "Has feedback", "Days submitted", "Days total"]
      .map(esc)
      .join(","),
  );
  for (const p of report.participation) {
    lines.push(
      [
        p.name,
        p.email,
        p.telephone,
        p.hasAnyFeedback ? "Yes" : "No",
        p.daysSubmitted,
        p.daysTotal,
      ]
        .map(esc)
        .join(","),
    );
  }
  lines.push("");

  lines.push("Submissions");
  lines.push(
    ["Type", "Target", "Submitter", "Email", "Anonymous", "Rating", "Comment", "Submitted"]
      .map(esc)
      .join(","),
  );
  for (const s of report.submissions) {
    lines.push(
      [
        s.feedbackType,
        s.targetKey,
        s.user?.name,
        s.user?.email,
        s.isAnonymous ? "Yes" : "No",
        s.rating,
        s.comment,
        s.createdAt ? new Date(s.createdAt).toISOString() : "",
      ]
        .map(esc)
        .join(","),
    );
  }

  return `\uFEFF${lines.join("\n")}`;
}
