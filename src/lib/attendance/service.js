import { prisma } from "@/lib/prisma";
import {
  countAttendanceMarks,
  createAttendanceMark,
  findAttendanceMarks,
} from "@/lib/attendance/db";
import { mapConferenceForUi } from "@/lib/conferences/service";
import {
  formatAttendanceDayLabel,
  getTodayConferenceDay,
  isConferenceRunningToday,
  normalizeConferenceDays,
} from "@/lib/attendance/utils";
import { computeAttendanceStats } from "@/lib/attendance/stats";

export { getCertificateSummaries } from "@/lib/certificates/service";

/**
 * @param {string} userId
 */
export async function getRunningAttendanceConferences(userId) {
  const registrations = await prisma.conferenceRegistration.findMany({
    where: { userId, status: "CONFIRMED" },
    include: { conference: true },
    orderBy: { registeredAt: "desc" },
  });

  const conferenceIds = registrations.map((r) => r.conferenceId);
  const marks =
    conferenceIds.length > 0
      ? await findAttendanceMarks(
          { userId, conferenceId: { in: conferenceIds } },
          { select: { conferenceId: true, dayDate: true, markedAt: true } },
        )
      : [];

  const marksByConference = new Map();
  for (const m of marks) {
    if (!marksByConference.has(m.conferenceId)) {
      marksByConference.set(m.conferenceId, []);
    }
    marksByConference.get(m.conferenceId).push(m);
  }

  const results = [];

  for (const reg of registrations) {
    if (!isConferenceRunningToday(reg.conference)) continue;

    const days = normalizeConferenceDays(reg.conference.conferenceDays);
    const tz = reg.conference.timezone || "Africa/Nairobi";
    const conferenceMarks = marksByConference.get(reg.conferenceId) ?? [];
    const stats = computeAttendanceStats(days, conferenceMarks, tz);
    const today = getTodayConferenceDay(reg.conference);
    const mapped = mapConferenceForUi(reg.conference);

    results.push({
      registrationId: reg.id,
      conference: {
        id: mapped.id,
        slug: mapped.slug,
        title: mapped.title,
        cardImage: mapped.cardImage,
        dateRange: mapped.dateRange,
        lifecycleStatus: mapped.status,
      },
      today: today
        ? {
            date: today.date,
            dayIndex: today.dayIndex,
            label: formatAttendanceDayLabel(today.date, today.dayIndex, today.totalDays),
            startTime: today.startTime,
            endTime: today.endTime,
            phase: today.phase,
            canCheckIn: today.canCheckIn && !conferenceMarks.some((m) => m.dayDate === today.date),
            alreadyMarked: conferenceMarks.some((m) => m.dayDate === today.date),
          }
        : null,
      stats,
    });
  }

  return results;
}

/**
 * @param {string} userId
 */
export async function getAllAttendanceSummaries(userId) {
  const registrations = await prisma.conferenceRegistration.findMany({
    where: { userId, status: "CONFIRMED" },
    include: { conference: true },
    orderBy: { registeredAt: "desc" },
  });

  const conferenceIds = registrations.map((r) => r.conferenceId);
  const marks =
    conferenceIds.length > 0
      ? await findAttendanceMarks(
          { userId, conferenceId: { in: conferenceIds } },
          { select: { conferenceId: true, dayDate: true } },
        )
      : [];

  const marksByConference = new Map();
  for (const m of marks) {
    if (!marksByConference.has(m.conferenceId)) {
      marksByConference.set(m.conferenceId, []);
    }
    marksByConference.get(m.conferenceId).push(m);
  }

  return registrations
    .filter((reg) => normalizeConferenceDays(reg.conference.conferenceDays).length > 0)
    .map((reg) => {
      const days = normalizeConferenceDays(reg.conference.conferenceDays);
      const tz = reg.conference.timezone || "Africa/Nairobi";
      const conferenceMarks = marksByConference.get(reg.conferenceId) ?? [];
      const stats = computeAttendanceStats(days, conferenceMarks, tz);
      const mapped = mapConferenceForUi(reg.conference);
      const runningToday = isConferenceRunningToday(reg.conference);

      return {
        conference: {
          slug: mapped.slug,
          title: mapped.title,
          cardImage: mapped.cardImage,
          dateRange: mapped.dateRange,
        },
        stats,
        runningToday,
      };
    });
}

/**
 * @param {string} userId
 * @param {string} slug
 */
export async function getAttendanceConferenceDetail(userId, slug) {
  const registration = await prisma.conferenceRegistration.findFirst({
    where: {
      userId,
      status: "CONFIRMED",
      conference: { slug },
    },
    include: { conference: true },
  });

  if (!registration) {
    throw new Error("Approved registration not found for this conference.");
  }

  const conference = registration.conference;
  const days = normalizeConferenceDays(conference.conferenceDays);
  if (!days.length) {
    throw new Error("This conference has no scheduled days configured.");
  }

  const tz = conference.timezone || "Africa/Nairobi";
  const marks = await findAttendanceMarks(
    { userId, conferenceId: conference.id },
    { orderBy: { dayDate: "asc" } },
  );

  const stats = computeAttendanceStats(days, marks, tz);
  const today = getTodayConferenceDay(conference);
  const mapped = mapConferenceForUi(conference);
  const runningToday = Boolean(today);

  return {
    registrationId: registration.id,
    conference: {
      id: mapped.id,
      slug: mapped.slug,
      title: mapped.title,
      cardImage: mapped.cardImage,
      dateRange: mapped.dateRange,
      lifecycleStatus: mapped.status,
      timezone: tz,
    },
    runningToday,
    today: today
      ? {
          date: today.date,
          dayIndex: today.dayIndex,
          label: formatAttendanceDayLabel(today.date, today.dayIndex, today.totalDays),
          startTime: today.startTime,
          endTime: today.endTime,
          phase: today.phase,
          canCheckIn:
            today.canCheckIn && !marks.some((m) => m.dayDate === today.date),
          alreadyMarked: marks.some((m) => m.dayDate === today.date),
        }
      : null,
    stats,
    marks: marks.map((m) => ({
      dayDate: m.dayDate,
      dayIndex: m.dayIndex,
      markedAt: m.markedAt,
    })),
  };
}

/**
 * @param {string} userId
 * @param {string} slug
 */
export async function checkInAttendance(userId, slug) {
  const detail = await getAttendanceConferenceDetail(userId, slug);

  if (!detail.runningToday || !detail.today) {
    throw new Error("Attendance check-in is only available on scheduled conference days.");
  }

  if (detail.today.alreadyMarked) {
    throw new Error("You have already registered attendance for today.");
  }

  if (!detail.today.canCheckIn) {
    if (detail.today.phase === "before_window") {
      throw new Error(
        `Check-in opens at ${detail.today.startTime} (${detail.conference.timezone}).`,
      );
    }
    if (detail.today.phase === "after_window") {
      throw new Error(
        `Today's attendance window closed at ${detail.today.endTime}.`,
      );
    }
    throw new Error("Attendance check-in is not open right now.");
  }

  await createAttendanceMark({
    conferenceId: detail.conference.id,
    userId,
    dayDate: detail.today.date,
    dayIndex: detail.today.dayIndex,
  });

  return getAttendanceConferenceDetail(userId, slug);
}

