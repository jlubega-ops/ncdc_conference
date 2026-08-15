import { getZonedDateTimeParts, getDayWindowState } from "@/lib/attendance/utils";

/**
 * @param {string | Date | null | undefined} value
 */
function toDateKey(value) {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

/**
 * @param {Array<{
 *   date: string;
 *   startTime: string;
 *   endTime: string;
 *   attendanceStartTime?: string;
 *   attendanceEndTime?: string;
 *   dayIndex: number;
 * }>} days
 * @param {Array<{ dayDate: string }>} marks
 * @param {string} timeZone
 */
export function computeAttendanceStats(days, marks, timeZone) {
  // Any stored mark counts as attended (self check-in or admin override),
  // so attendee and admin views stay in sync.
  const markSet = new Set(
    (marks || []).map((m) => toDateKey(m.dayDate)).filter(Boolean),
  );
  const { dateKey: todayKey } = getZonedDateTimeParts(new Date(), timeZone);

  let attended = 0;
  let missed = 0;
  let remaining = 0;
  let todayOpen = false;

  const dayBreakdown = days.map((day) => {
    const dateKey = toDateKey(day.date);
    const marked = markSet.has(dateKey);
    const window = getDayWindowState(
      dateKey,
      day.attendanceStartTime || day.startTime,
      day.attendanceEndTime || day.endTime,
      timeZone,
    );
    let status = "upcoming";

    if (marked) {
      // Admin override or check-in always shows as attended, even for future days.
      status = "attended";
      attended += 1;
    } else if (dateKey < todayKey) {
      status = "missed";
      missed += 1;
    } else if (dateKey === todayKey) {
      todayOpen = window.phase === "open";
      if (window.phase === "after_window") {
        status = "missed";
        missed += 1;
      } else {
        status = window.phase === "before_window" ? "today_upcoming" : "today_open";
        remaining += 1;
      }
    } else {
      status = "upcoming";
      remaining += 1;
    }

    return {
      ...day,
      date: dateKey,
      status,
      marked,
      windowPhase: window.phase,
      canCheckIn: window.canCheckIn && !marked,
    };
  });

  const elapsed = attended + missed;
  const performanceRate = elapsed > 0 ? Math.round((attended / elapsed) * 100) : 0;
  const overallProgress =
    days.length > 0 ? Math.round((attended / days.length) * 100) : 0;

  return {
    totalDays: days.length,
    attended,
    missed,
    remaining,
    elapsed,
    performanceRate,
    overallProgress,
    todayOpen,
    dayBreakdown,
  };
}
