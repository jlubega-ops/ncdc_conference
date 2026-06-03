import { randomBytes } from "crypto";
import { CERTIFICATE_NUMBER_PREFIX } from "@/lib/certificates/constants";

/** Excludes 0/O, 1/I/L for clarity when read aloud or typed. */
const SEGMENT_CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * @param {string} slug
 */
export function conferenceCodeFromSlug(slug) {
  const clean = String(slug ?? "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  const code = (clean.slice(0, 4) || "CONF").padEnd(4, "X");
  return code;
}

/**
 * @param {number} [length]
 */
export function generateCertificateSegment(length = 8) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SEGMENT_CHARSET[bytes[i] % SEGMENT_CHARSET.length];
  }
  return out;
}

/**
 * @param {{ year: number | string; conferenceCode: string; segment: string }} parts
 */
export function formatCertificateNumber({ year, conferenceCode, segment }) {
  return `${CERTIFICATE_NUMBER_PREFIX}/${year}/${conferenceCode}/${segment}`;
}

/**
 * Normalize user input (trim, uppercase segment parts).
 * @param {string} raw
 */
export function normalizeCertificateNumberInput(raw) {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/**
 * @param {string} value
 */
export function isValidCertificateNumberFormat(value) {
  const normalized = normalizeCertificateNumberInput(value);
  const re = /^NCDC\/\d{4}\/[A-Z0-9]{4}\/[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;
  return re.test(normalized);
}

/**
 * URL-safe token for QR codes and share links (slashes → dashes).
 * @param {string} certificateNumber
 */
export function certificateNumberToVerifyToken(certificateNumber) {
  return normalizeCertificateNumberInput(certificateNumber).replace(/\//g, "-");
}

/**
 * @param {string} token
 */
export function verifyTokenToCertificateNumber(token) {
  const raw = String(token ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (raw.includes("/")) {
    return normalizeCertificateNumberInput(raw);
  }

  if (/^NCDC-\d{4}-[A-Z0-9]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(raw)) {
    return raw.replace(/-/g, "/");
  }

  return normalizeCertificateNumberInput(raw);
}
