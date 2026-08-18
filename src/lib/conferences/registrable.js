/**
 * @param {Date | string | null | undefined} openAt
 * @param {Date | string | null | undefined} closeAt
 * @param {Date} [now]
 */
export function isDateWindowOpen(openAt, closeAt, now = new Date()) {
  if (!openAt || !closeAt) return false;
  const start = new Date(openAt);
  const end = new Date(closeAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  return now >= start && now <= end;
}

/**
 * Registration and CFP must both be within their open windows.
 * @param {any} conference
 * @param {Date} [now]
 */
/**
 * CFP window only (for paper submission eligibility).
 * @param {any} conference
 * @param {Date} [now]
 */
export function isCfpOpen(conference, now = new Date()) {
  if (!conference?.allowPaperSubmissions) return false;
  return isDateWindowOpen(conference.cfpOpenAt, conference.cfpCloseAt, now);
}

export function isRegistrableConference(conference, now = new Date()) {
  const mode = conference.registrationMode || "MANUAL_APPROVE";
  if (mode === "OPEN_NO_REGISTRATION" || mode === "ADMIN_UPLOAD") {
    return false;
  }

  const registrationOpen = isDateWindowOpen(
    conference.registrationOpenAt,
    conference.registrationCloseAt,
    now,
  );
  // Prefer registration window; fall back to CFP window for older conferences.
  if (conference.registrationOpenAt && conference.registrationCloseAt) {
    return registrationOpen;
  }
  const cfpOpen = isDateWindowOpen(conference.cfpOpenAt, conference.cfpCloseAt, now);
  return registrationOpen || cfpOpen;
}

/**
 * Whether the public Register button should appear.
 * @param {any} conference
 */
export function allowsPublicRegistration(conference) {
  const mode = conference.registrationMode || "MANUAL_APPROVE";
  return mode === "AUTO_APPROVE" || mode === "MANUAL_APPROVE";
}

/**
 * @param {any} conference - raw or mapped conference row
 */
export function getConferenceYear(conference) {
  if (conference.startDate) {
    return new Date(conference.startDate).getFullYear();
  }
  const days = conference.conferenceDays;
  if (Array.isArray(days) && days[0]?.date) {
    return new Date(`${days[0].date}T00:00:00`).getFullYear();
  }
  if (conference.year) return conference.year;
  return new Date().getFullYear();
}
