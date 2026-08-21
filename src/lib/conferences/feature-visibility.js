import { allowsPublicRegistration } from "@/lib/conferences/registrable";
import { normalizeGiftsSettings } from "@/lib/gifts/settings";
import { normalizeTourSettings } from "@/lib/tour/settings";
import { normalizeAttendanceSettings } from "@/lib/attendance/settings";
import { normalizeCertificateSettings } from "@/lib/certificates/settings";
import { normalizeFeedbackSettings } from "@/lib/feedback/questions";
import { normalizeConferenceDays } from "@/lib/attendance/utils";

/**
 * Shared feature flags used to hide tabs / nav when a conference
 * does not enable or configure that area.
 */

/**
 * @param {any} conference
 */
export function conferenceHasDays(conference) {
  return (
    Array.isArray(conference?.conferenceDays) &&
    conference.conferenceDays.some((day) => day?.date)
  );
}

/**
 * @param {any} conference
 */
export function conferenceAllowsPaperSubmissions(conference) {
  return Boolean(conference?.allowPaperSubmissions);
}

/**
 * Registrations / attendance roster management (public register or admin upload).
 * @param {any} conference
 */
export function conferenceManagesRegistrations(conference) {
  const mode = conference?.registrationMode || "MANUAL_APPROVE";
  return mode !== "OPEN_NO_REGISTRATION";
}

/**
 * @param {any} conference
 */
export function conferenceHasGifts(conference) {
  return Boolean(normalizeGiftsSettings(conference?.giftsSettings).applicable);
}

/**
 * @param {any} conference
 */
export function conferenceHasFeedback(conference) {
  if (!conferenceHasDays(conference)) return false;
  return normalizeFeedbackSettings(conference?.feedbackSettings).allowed !== false;
}

/**
 * Attendance marking is day-based and must be enabled in settings.
 * @param {any} conference
 */
export function conferenceHasAttendance(conference) {
  if (!conferenceHasDays(conference)) return false;
  return normalizeAttendanceSettings(conference?.attendanceSettings).allowed !== false;
}

/**
 * @param {any} conference
 */
export function conferenceHasCertificates(conference) {
  const days = normalizeConferenceDays(conference?.conferenceDays);
  return normalizeCertificateSettings(conference?.certificateSettings, {
    totalDays: days.length || 1,
  }).allowed;
}

/**
 * @param {any} conference
 */
export function conferenceHasTour(conference) {
  return normalizeTourSettings(conference?.tourSettings).allowed;
}

/**
 * Whether an admin management tab should appear for this conference.
 * @param {string} tabId
 * @param {any} conference
 */
export function isAdminConferenceTabVisible(tabId, conference) {
  switch (tabId) {
    case "registrations":
      return conferenceManagesRegistrations(conference);
    case "attendance":
      return conferenceHasAttendance(conference);
    case "certificates":
      return conferenceHasCertificates(conference);
    case "gifts":
      return conferenceHasGifts(conference);
    case "tour":
      return conferenceHasTour(conference);
    case "submissions":
      return conferenceAllowsPaperSubmissions(conference);
    case "feedback":
      return conferenceHasFeedback(conference);
    case "info":
    case "materials":
    case "admins":
      return true;
    default:
      return true;
  }
}

/**
 * Filter conferences for a dashboard picker keyed by tab id.
 * @param {any[]} conferences
 * @param {string} tab
 */
export function filterConferencesForAdminTab(conferences, tab) {
  const list = Array.isArray(conferences) ? conferences : [];
  return list.filter((conference) => isAdminConferenceTabVisible(tab, conference));
}

/**
 * Which dashboard sidebar permissions to keep based on managed conferences.
 * @param {any[]} conferences
 */
export function getDashboardNavFeatureFlags(conferences) {
  const list = Array.isArray(conferences) ? conferences : [];
  return {
    submissions: list.some(conferenceAllowsPaperSubmissions),
    registrations: list.some(conferenceManagesRegistrations),
    feedback: list.some(conferenceHasFeedback),
  };
}

/**
 * Public / member conference page tab visibility for configured content.
 * Runtime access gates (auth, registration status) are applied separately.
 * @param {string} tabId
 * @param {any} conference
 */
export function isPublicConferenceFeatureConfigured(tabId, conference) {
  switch (tabId) {
    case "cfp":
      return conferenceAllowsPaperSubmissions(conference);
    case "registration":
      return allowsPublicRegistration(conference);
    case "attendance":
      return conferenceHasAttendance(conference) || conferenceHasCertificates(conference);
    case "certificate":
      return conferenceHasCertificates(conference);
    case "feedback":
      return conferenceHasFeedback(conference);
    case "faqs":
      return Array.isArray(conference?.faqs) && conference.faqs.length > 0;
    case "programme": {
      const programme = Array.isArray(conference?.programme) ? conference.programme : [];
      const hasProgramme = programme.some(
        (day) => Array.isArray(day?.items) && day.items.length > 0,
      );
      const hasSpeakers =
        Array.isArray(conference?.speakers) && conference.speakers.length > 0;
      return hasProgramme || hasSpeakers;
    }
    default:
      return true;
  }
}
