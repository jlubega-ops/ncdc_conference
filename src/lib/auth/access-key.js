import { createHmac, randomBytes } from "crypto";
import { hashAccessKey } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

/** Uppercase charset without ambiguous characters (0, O, 1, I, L). */
export const ACCESS_KEY_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Short memorable codes (length 4). */
export const ACCESS_CODE_LENGTH = 4;

/** Legacy format: {ORG}/CONF{YYYY}/{SUFFIX} — all caps */
const LEGACY_ACCESS_KEY_PATTERN = /^([A-Z0-9]{2,12})\/CONF(\d{4})\/([A-Z2-9]+)$/;

/** New short codes: 4 safe alphanumeric characters. */
const SHORT_ACCESS_CODE_PATTERN = new RegExp(
  `^[${ACCESS_KEY_CHARSET}]{${ACCESS_CODE_LENGTH}}$`,
);

/**
 * Deterministic lookup token — used for legacy hashed lookup rows.
 * @param {string} fullKey
 */
export function accessKeyLookupToken(fullKey) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set (min 32 characters) in production");
    }
    return createHmac("sha256", "dev-only-session-secret-min-32-chars!!")
      .update(String(fullKey || "").trim().toUpperCase())
      .digest("hex");
  }
  return createHmac("sha256", secret)
    .update(String(fullKey || "").trim().toUpperCase())
    .digest("hex");
}

/**
 * @param {number} length
 */
export function generateAccessKeySuffix(length = ACCESS_CODE_LENGTH) {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += ACCESS_KEY_CHARSET[bytes[i] % ACCESS_KEY_CHARSET.length];
  }
  return result;
}

/**
 * Generate a platform-wide unique short access code.
 * @param {number} [length]
 * @param {number} [maxAttempts]
 */
export async function generateUniqueAccessCode(
  length = ACCESS_CODE_LENGTH,
  maxAttempts = 40,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateAccessKeySuffix(length);
    const existing = await prisma.conferenceAccessKey.findUnique({
      where: { displayCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique access code. Try again.");
}

/**
 * Normalize user input for access-code login.
 * @param {string} input
 */
export function normalizeAccessCodeInput(input) {
  return String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/**
 * @param {string} input
 * @returns {{
 *   kind: "short" | "legacy";
 *   code: string;
 *   org?: string;
 *   year?: number;
 *   suffix?: string;
 *   fullKey: string;
 * } | null}
 */
export function parseAccessKey(input) {
  const normalized = normalizeAccessCodeInput(input);
  if (!normalized) return null;

  if (SHORT_ACCESS_CODE_PATTERN.test(normalized)) {
    return {
      kind: "short",
      code: normalized,
      fullKey: normalized,
    };
  }

  const match = normalized.match(LEGACY_ACCESS_KEY_PATTERN);
  if (!match) return null;
  return {
    kind: "legacy",
    code: match[3],
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
  organiserShortName: _organiserShortName,
}) {
  const displayCode = await generateUniqueAccessCode();
  const keyHash = await hashAccessKey(displayCode);

  const record = await prisma.conferenceAccessKey.create({
    data: {
      conferenceId,
      email: String(email || "").trim().toLowerCase(),
      keyHash,
      displayCode,
      // Keep keySuffix aligned for simple lookups / older query paths.
      keySuffix: displayCode,
      conferenceYear: year,
      userId: userId ?? null,
      label: "issued",
    },
  });

  return {
    record,
    fullKey: displayCode,
    displayKey: displayCode,
    suffix: displayCode,
    displayCode,
  };
}
