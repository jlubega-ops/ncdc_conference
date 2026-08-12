const DEFAULT_TZ = "Africa/Nairobi";

/**
 * @param {Date} date
 * @param {string} timeZone
 */
export function getZonedDateTimeParts(date, timeZone = DEFAULT_TZ) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));

  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour ?? 0),
    minute: Number(map.minute ?? 0),
  };
}

/**
 * @param {string} time "HH:mm"
 */
export function parseTimeToMinutes(time) {
  if (!time || typeof time !== "string") return 0;
  const [h, m] = time.split(":").map((v) => Number(v));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * @param {unknown} raw
 * @returns {Array<{
 *   date: string;
 *   startTime: string;
 *   endTime: string;
 *   attendanceStartTime: string;
 *   attendanceEndTime: string;
 *   dayIndex: number;
 * }>}
 */
export function normalizeConferenceDays(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d) => d?.date)
    .map((d, index) => {
      const startTime = d.startTime || "09:00";
      const endTime = d.endTime || "17:00";
      return {
        date: String(d.date).slice(0, 10),
        startTime,
        endTime,
        attendanceStartTime: d.attendanceStartTime || startTime,
        attendanceEndTime: d.attendanceEndTime || endTime,
        dayIndex: index + 1,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * @param {string} dateKey YYYY-MM-DD
 * @param {string} startTime
 * @param {string} endTime
 * @param {string} [timeZone]
 */
export function getDayWindowState(dateKey, startTime, endTime, timeZone = DEFAULT_TZ) {
  const now = new Date();
  const { dateKey: todayKey, hour, minute } = getZonedDateTimeParts(now, timeZone);
  const nowMinutes = hour * 60 + minute;
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (todayKey !== dateKey) {
    if (todayKey < dateKey) {
      return { isToday: false, phase: "upcoming", canCheckIn: false };
    }
    return { isToday: false, phase: "past", canCheckIn: false };
  }

  if (nowMinutes < startMinutes) {
    return { isToday: true, phase: "before_window", canCheckIn: false };
  }
  if (nowMinutes > endMinutes) {
    return { isToday: true, phase: "after_window", canCheckIn: false };
  }
  return { isToday: true, phase: "open", canCheckIn: true };
}

/**
 * @param {{ conferenceDays?: unknown; timezone?: string | null; lifecycleStatus?: string }} conference
 * @param {Date} [now]
 */
export function getTodayConferenceDay(conference, now = new Date()) {
  const days = normalizeConferenceDays(conference.conferenceDays);
  if (!days.length) return null;

  const tz = conference.timezone || DEFAULT_TZ;
  const { dateKey: todayKey } = getZonedDateTimeParts(now, tz);
  const todayDay = days.find((d) => d.date === todayKey);
  if (!todayDay) return null;

  const window = getDayWindowState(
    todayDay.date,
    todayDay.attendanceStartTime || todayDay.startTime,
    todayDay.attendanceEndTime || todayDay.endTime,
    tz,
  );
  return {
    ...todayDay,
    ...window,
    checkInStartTime: todayDay.attendanceStartTime || todayDay.startTime,
    checkInEndTime: todayDay.attendanceEndTime || todayDay.endTime,
    timezone: tz,
    totalDays: days.length,
  };
}

/**
 * @param {{ conferenceDays?: unknown; timezone?: string | null }} conference
 */
export function isConferenceRunningToday(conference) {
  return Boolean(getTodayConferenceDay(conference));
}

/**
 * @param {string} dateKey
 * @param {number} dayIndex
 * @param {number} totalDays
 */
export function formatAttendanceDayLabel(dateKey, dayIndex, totalDays) {
  const label = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));

  return `Day ${dayIndex} of ${totalDays} — ${label}`;
}
