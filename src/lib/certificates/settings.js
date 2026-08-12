/**
 * @typedef {{
 *   allowed: boolean;
 *   basedOnAttendance: boolean;
 *   minAttendanceDays: number;
 *   downloadOpensAt: string | null;
 * }} CertificateSettings
 */

export const DEFAULT_CERTIFICATE_SETTINGS = {
  allowed: false,
  basedOnAttendance: true,
  minAttendanceDays: 1,
  downloadOpensAt: null,
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
    basedOnAttendance,
    minAttendanceDays: minDays,
    downloadOpensAt,
  };
}

/**
 * @param {any} conference
 */
export function isCertificatesAllowed(conference) {
  return normalizeCertificateSettings(conference?.certificateSettings).allowed;
}
