import { CERTIFICATE_MIN_ATTENDANCE_PERCENT } from "@/lib/certificates/constants";

/**
 * Certificate when attendee marked ≥90% of scheduled days and the conference has ended.
 * @param {{ overallProgress: number; remaining: number; totalDays: number; elapsed: number }} stats
 * @param {string} lifecycleStatus
 */
export function isCertificateEligible(stats, lifecycleStatus) {
  if (!stats?.totalDays || stats.totalDays < 1) return false;
  if (stats.overallProgress < CERTIFICATE_MIN_ATTENDANCE_PERCENT) return false;

  const conferenceEnded =
    lifecycleStatus === "completed" ||
    (stats.remaining === 0 && stats.elapsed >= stats.totalDays);

  return conferenceEnded;
}

/**
 * @param {number} overallProgress
 */
export function certificateEligibilityMessage(overallProgress, conferenceEnded) {
  if (!conferenceEnded) {
    return `Certificates are issued after the conference ends. You need at least ${CERTIFICATE_MIN_ATTENDANCE_PERCENT}% attendance (currently ${overallProgress}%).`;
  }
  if (overallProgress >= CERTIFICATE_MIN_ATTENDANCE_PERCENT) {
    return "Your certificate is available for download and email.";
  }
  return `Reach at least ${CERTIFICATE_MIN_ATTENDANCE_PERCENT}% attendance across all conference days (currently ${overallProgress}%).`;
}
