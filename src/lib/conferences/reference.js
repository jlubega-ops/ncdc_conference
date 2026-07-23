const REF_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * @param {number} [length]
 */
function randomSegment(length = 5) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += REF_CHARSET[bytes[i] % REF_CHARSET.length];
  }
  return out;
}

/**
 * Normalize organiser short name for codes (2–12 uppercase A–Z / 0–9).
 * @param {string | null | undefined} raw
 * @param {string} [fallback]
 */
export function normalizeOrganiserShortName(raw, fallback = "ORG") {
  const cleaned = String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  if (cleaned.length >= 2) return cleaned;
  const fb = String(fallback)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  return fb.length >= 2 ? fb : "ORG";
}

/**
 * Public conference reference with org short name first, e.g. NCDC-K7M2P-2027.
 * @param {{
 *   year?: number | null;
 *   existing?: string | null;
 *   organiserShortName?: string | null;
 * }} [opts]
 */
export function generateConferenceReference(opts = {}) {
  const year = opts.year || new Date().getFullYear();
  if (opts.existing) {
    return String(opts.existing).trim().toUpperCase();
  }
  const org = normalizeOrganiserShortName(opts.organiserShortName);
  return `${org}-${randomSegment(5)}-${year}`;
}

/**
 * Normalize user input for reference lookup.
 * @param {string} raw
 */
export function normalizeConferenceReferenceInput(raw) {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}
