import { canViewConferenceContent as canViewWithRegistration } from "@/lib/registration/access";

export { normalizePaidContentVisibility } from "@/lib/registration/access";

/**
 * @param {any} conference
 * @param {"viewProgramme"|"viewSpeakers"|"viewOnlineLinks"} key
 * @param {string | null | undefined} [registrationStatus]
 */
export function canViewConferenceContent(conference, key, registrationStatus) {
  return canViewWithRegistration(conference, key, registrationStatus);
}
