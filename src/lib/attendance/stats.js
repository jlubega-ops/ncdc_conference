import { getZonedDateTimeParts, getDayWindowState, normalizeConferenceDays } from "@/lib/attendance/utils";

/**
 * @param {Array<{ date: string; startTime: string; endTime: string; dayIndex: number }>} days
 * @param {Array<{ dayDate: string }>} marks
 * @param {string} timeZone
 */
export function computeAttendanceStats(days, marks, timeZone) {
  const markSet = new Set(marks.map((m) => m.dayDate));
  const { dateKey: todayKey } = getZonedDateTimeParts(new Date(), timeZone);

  let attended = 0;
  let missed = 0;
  let remaining = 0;
  let todayOpen = false;

  const dayBreakdown = days.map((day) => {
    const marked = markSet.has(day.date);
    const window = getDayWindowState(day.date, day.startTime, day.endTime, timeZone);
    let status = "upcoming";

    if (day.date < todayKey) {
      status = marked ? "attended" : "missed";
      if (marked) attended += 1;
      else missed += 1;
    } else if (day.date === todayKey) {
      todayOpen = window.phase === "open";
      if (marked) {
        status = "attended";
        attended += 1;
      } else if (window.phase === "after_window") {
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

/** @deprecated Use isCertificateEligible from @/lib/certificates/eligibility */
export { isCertificateEligible } from "@/lib/certificates/eligibility";
