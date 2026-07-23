import { createHmac, randomBytes } from "crypto";
import { hashAccessKey } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { normalizeOrganiserShortName } from "@/lib/conferences/reference";

/** Uppercase charset without ambiguous characters (0, O, 1, I, L). */
export const ACCESS_KEY_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** {ORG}/CONF{YYYY}/{SUFFIX} — all caps */
const ACCESS_KEY_PATTERN = /^([A-Z0-9]{2,12})\/CONF(\d{4})\/([A-Z2-9]+)$/;

/**
 * Deterministic lookup token — never store the plaintext access key.
 * @param {string} fullKey
 */
export function accessKeyLookupToken(fullKey) {
  const secret = process.env.SESSION_SECRET || "ncdc-access-key-fallback";
  return createHmac("sha256", secret)
    .update(String(fullKey || "").trim().toUpperCase())
    .digest("hex");
}

/**
 * @param {number} length
 */
export function generateAccessKeySuffix(length = 8) {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += ACCESS_KEY_CHARSET[bytes[i] % ACCESS_KEY_CHARSET.length];
  }
  return result;
}

/**
 * @param {string} orgShort
 * @param {number} year
 * @param {string} suffix
 */
export function formatAccessKey(orgShort, year, suffix) {
  const org = normalizeOrganiserShortName(orgShort);
  return `${org}/CONF${year}/${String(suffix).toUpperCase()}`;
}

/** Always uppercase for one-time email delivery only — never persist or show in admin UI. */
export function displayAccessKey(orgShort, year, suffix) {
  return formatAccessKey(orgShort, year, suffix);
}

/**
 * @param {string} input
 * @returns {{ org: string, year: number, suffix: string, fullKey: string } | null}
 */
export function parseAccessKey(input) {
  if (!input?.trim()) return null;
  const normalized = input.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(ACCESS_KEY_PATTERN);
  if (!match) return null;
  return {
    org: match[1],
    year: Number.parseInt(match[2], 10),
    suffix: match[3],
    fullKey: `${match[1]}/CONF${match[2]}/${match[3]}`,
  };
}

/**
 * @param {string} input
 */
export function isValidAccessKeyFormat(input) {
  return parseAccessKey(input) !== null;
}

/**
 * Permanently remove prior access keys for this attendee on a conference.
 * @param {{ conferenceId: string; email: string; userId?: string | null }} params
 */
export async function deleteConferenceAccessKeysForUser({ conferenceId, email, userId = null }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const or = [
    ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
    ...(userId ? [{ userId }] : []),
  ];
  if (or.length === 0) return;
  await prisma.conferenceAccessKey.deleteMany({
    where: {
      conferenceId,
      OR: or,
    },
  });
}

/**
 * @param {{
 *   conferenceId: string;
 *   email: string;
 *   year: number;
 *   userId?: string | null;
 *   organiserShortName?: string | null;
 * }} params
 */
export async function createConferenceAccessKeyRecord({
  conferenceId,
  email,
  year,
  userId,
  organiserShortName,
}) {
  const suffix = generateAccessKeySuffix(8);
  const fullKey = formatAccessKey(organiserShortName, year, suffix);
  const keyHash = await hashAccessKey(fullKey);
  const lookup = accessKeyLookupToken(fullKey);

  const record = await prisma.conferenceAccessKey.create({
    data: {
      conferenceId,
      email: String(email || "").trim().toLowerCase(),
      keyHash,
      // Store HMAC lookup token only — never plaintext suffix or full key.
      keySuffix: lookup,
      conferenceYear: year,
      userId: userId ?? null,
      label: "issued",
    },
  });

  return {
    record,
    fullKey,
    displayKey: displayAccessKey(organiserShortName, year, suffix),
    suffix,
  };
}
