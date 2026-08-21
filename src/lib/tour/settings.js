/**
 * @typedef {{
 *   allowed: boolean;
 * }} TourSettings
 */

export const DEFAULT_TOUR_SETTINGS = {
  allowed: false,
};

/**
 * @param {unknown} raw
 * @returns {TourSettings}
 */
export function normalizeTourSettings(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_TOUR_SETTINGS };
  }
  return {
    allowed: Boolean(raw.allowed),
  };
}

/**
 * @param {any} conference
 */
export function isTourRegistrationAllowed(conference) {
  return normalizeTourSettings(conference?.tourSettings).allowed;
}
