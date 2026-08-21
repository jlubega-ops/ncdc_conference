/**
 * @typedef {{
 *   allowed: boolean;
 *   allowEmailRequest: boolean;
 *   basedOnAttendance: boolean;
 *   minAttendanceDays: number;
 *   downloadOpensAt: string | null;
 *   templateUrl: string | null;
 * }} CertificateSettings
 */

export const DEFAULT_CERTIFICATE_SETTINGS = {
  allowed: false,
  allowEmailRequest: false,
  basedOnAttendance: true,
  minAttendanceDays: 1,
  downloadOpensAt: null,
  /** Public URL of custom A4 landscape PDF template, or null for bundled default. */
  templateUrl: null,
};

/**
 * @param {unknown} raw
 * @param {{ totalDays?: number }} [opts]
 * @returns {CertificateSettings}
 */
export function normalizeCertificateSettings(raw, opts = {}) {
  const totalDays = Math.max(1, Number(opts.totalDays) || 1);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ...DEFAULT_CERTIFICATE_SETTINGS,
      minAttendanceDays: Math.min(totalDays, DEFAULT_CERTIFICATE_SETTINGS.minAttendanceDays),
    };
  }

  const basedOnAttendance = raw.basedOnAttendance !== false;
  let minDays = Number(raw.minAttendanceDays);
  if (!Number.isFinite(minDays) || minDays < 1) minDays = 1;
  minDays = Math.min(totalDays, Math.floor(minDays));

  let downloadOpensAt = null;
  if (raw.downloadOpensAt) {
    const d = new Date(raw.downloadOpensAt);
    if (!Number.isNaN(d.getTime())) downloadOpensAt = d.toISOString();
  }

  return {
    allowed: Boolean(raw.allowed),
    // Default off — only true when explicitly enabled on the conference.
    allowEmailRequest: Boolean(raw.allowEmailRequest),
    basedOnAttendance,
    minAttendanceDays: minDays,
    downloadOpensAt,
    templateUrl: (() => {
      const url = String(raw.templateUrl || "").trim();
      return url || null;
    })(),
  };
}

/**
 * @param {any} conference
 */
export function isCertificatesAllowed(conference) {
  return normalizeCertificateSettings(conference?.certificateSettings).allowed;
}

/**
 * Whether attendees may request a certificate by email for this conference.
 * @param {any} conference
 */
export function isCertificateEmailRequestAllowed(conference) {
  const settings = normalizeCertificateSettings(conference?.certificateSettings);
  return settings.allowed && settings.allowEmailRequest;
}
