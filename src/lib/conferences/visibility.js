import { DEFAULT_PAID_VISIBILITY } from "@/lib/conferences/constants";

/**
 * @param {unknown} raw
 */
export function normalizePaidContentVisibility(raw) {
  const base = { ...DEFAULT_PAID_VISIBILITY };
  if (!raw || typeof raw !== "object") return base;
  return {
    viewProgramme: raw.viewProgramme !== false,
    viewSpeakers: raw.viewSpeakers !== false,
    viewOnlineLinks: Boolean(raw.viewOnlineLinks),
  };
}

/**
 * @param {any} conference
 * @param {"viewProgramme"|"viewSpeakers"|"viewOnlineLinks"} key
 */
export function canViewConferenceContent(conference, key) {
  if (!conference?.requiresPayment) return true;
  const visibility = normalizePaidContentVisibility(conference.paidContentVisibility);
  return Boolean(visibility[key]);
}
