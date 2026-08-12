/**
 * @typedef {{ allowed: boolean }} AttendanceSettings
 */

export const DEFAULT_ATTENDANCE_SETTINGS = {
  allowed: true,
};

/**
 * @param {unknown} raw
 * @returns {AttendanceSettings}
 */
export function normalizeAttendanceSettings(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_ATTENDANCE_SETTINGS };
  }
  return {
    allowed: raw.allowed !== false,
  };
}

/**
 * @param {any} conference
 */
export function isAttendanceAllowed(conference) {
  return normalizeAttendanceSettings(conference?.attendanceSettings).allowed;
}
