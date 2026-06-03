function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseConferenceDays(days) {
  if (!Array.isArray(days)) return [];
  return days
    .map((day) => {
      if (!day?.date) return null;
      const startTime = day.startTime || "00:00";
      const endTime = day.endTime || "23:59";
      const start = parseDate(`${day.date}T${startTime}:00`);
      const end = parseDate(`${day.date}T${endTime}:00`);
      if (!start || !end) return null;
      return { start, end };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}

/**
 * Computes conference lifecycle from schedule windows and conference days.
 * @param {object} input
 */
export function computeLifecycleStatus(input) {
  const now = new Date();
  const cfpOpenAt = parseDate(input.cfpOpenAt);
  const cfpCloseAt = parseDate(input.cfpCloseAt);
  const registrationOpenAt = parseDate(input.registrationOpenAt);
  const registrationCloseAt = parseDate(input.registrationCloseAt);
  const days = parseConferenceDays(input.conferenceDays);

  if (days.some((d) => now >= d.start && now <= d.end)) {
    return "running";
  }

  if (registrationOpenAt && registrationCloseAt && now >= registrationOpenAt && now <= registrationCloseAt) {
    return "registration_open";
  }

  if (cfpOpenAt && cfpCloseAt && now >= cfpOpenAt && now <= cfpCloseAt) {
    return "cfp_open";
  }

  if (days.length > 0) {
    if (now < days[0].start) return "upcoming";
    if (now > days[days.length - 1].end) return "completed";
  }

  return "upcoming";
}

