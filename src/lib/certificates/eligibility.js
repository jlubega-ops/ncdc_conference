import { normalizeCertificateSettings } from "@/lib/certificates/settings";
import { normalizeConferenceDays, getZonedDateTimeParts } from "@/lib/attendance/utils";

/**
 * @param {any} conference
 * @param {ReturnType<typeof normalizeCertificateSettings>} [settings]
 * @param {ReturnType<typeof normalizeConferenceDays>} [days]
 */
export function isCertificateDownloadOpen(conference, settings, days) {
  const normalizedDays = days || normalizeConferenceDays(conference?.conferenceDays);
  const cfg =
    settings ||
    normalizeCertificateSettings(conference?.certificateSettings, {
      totalDays: normalizedDays.length || 1,
    });

  if (!cfg.allowed) return false;
  if (!normalizedDays.length) return false;

  const now = new Date();
  const tz = conference?.timezone || "Africa/Nairobi";
  const { dateKey: todayKey } = getZonedDateTimeParts(now, tz);
  const lastDay = normalizedDays[normalizedDays.length - 1];

  if (cfg.downloadOpensAt) {
    const opens = new Date(cfg.downloadOpensAt);
    if (!Number.isNaN(opens.getTime())) {
      return now >= opens;
    }
  }

  // Default: certificates open from the last conference day onward.
  return todayKey >= lastDay.date;
}

/**
 * @param {{ overallProgress?: number; remaining?: number; totalDays: number; elapsed?: number; attended?: number }} stats
 * @param {any} conference
 */
export function isCertificateEligible(stats, conference) {
  const days = normalizeConferenceDays(conference?.conferenceDays);
  const settings = normalizeCertificateSettings(conference?.certificateSettings, {
    totalDays: days.length || stats?.totalDays || 1,
  });

  if (!settings.allowed) return false;
  if (!stats?.totalDays || stats.totalDays < 1) return false;
  if (!isCertificateDownloadOpen(conference, settings, days)) return false;

  if (settings.basedOnAttendance) {
    const attended = Number(stats.attended ?? 0);
    return attended >= settings.minAttendanceDays;
  }

  return true;
}

/**
 * @param {{ overallProgress?: number; attended?: number; totalDays: number }} stats
 * @param {any} conference
 */
export function certificateEligibilityMessage(stats, conference) {
  const days = normalizeConferenceDays(conference?.conferenceDays);
  const settings = normalizeCertificateSettings(conference?.certificateSettings, {
    totalDays: days.length || stats?.totalDays || 1,
  });

  if (!settings.allowed) {
    return "Certificates are not enabled for this conference.";
  }

  if (!isCertificateDownloadOpen(conference, settings, days)) {
    if (settings.downloadOpensAt) {
      const opens = new Date(settings.downloadOpensAt);
      return `Certificate download opens on ${opens.toLocaleString("en-GB")}.`;
    }
    return "Certificates become available from the last day of the conference.";
  }

  if (settings.basedOnAttendance) {
    const attended = Number(stats.attended ?? 0);
    if (attended >= settings.minAttendanceDays) {
      return "Your certificate is available for download and email.";
    }
    return `Attend at least ${settings.minAttendanceDays} of ${stats.totalDays} conference day${
      stats.totalDays === 1 ? "" : "s"
    } to unlock your certificate (currently ${attended}).`;
  }

  return "Your certificate is available for download and email.";
}
