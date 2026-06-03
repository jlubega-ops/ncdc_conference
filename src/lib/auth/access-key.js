import { randomBytes } from "crypto";
import { hashAccessKey } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

/** Uppercase charset without ambiguous characters (0, O, 1, I, L). */
export const ACCESS_KEY_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const ACCESS_KEY_PATTERN = /^NCDC\/CONF(\d{4})\/([A-Z2-9]+)$/;

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
 * @param {number} year
 * @param {string} suffix
 */
export function formatAccessKey(year, suffix) {
  return `NCDC/CONF${year}/${suffix.toUpperCase()}`;
}

/** Human-readable display (Conf with mixed case per NCDC convention). */
export function displayAccessKey(year, suffix) {
  return `NCDC/Conf${year}/${suffix.toUpperCase()}`;
}

/**
 * @param {string} input
 * @returns {{ year: number, suffix: string, fullKey: string } | null}
 */
export function parseAccessKey(input) {
  if (!input?.trim()) return null;
  const normalized = input.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(ACCESS_KEY_PATTERN);
  if (!match) return null;
  return {
    year: Number.parseInt(match[1], 10),
    suffix: match[2],
    fullKey: `NCDC/CONF${match[1]}/${match[2]}`,
  };
}

/**
 * @param {string} input
 */
export function isValidAccessKeyFormat(input) {
  return parseAccessKey(input) !== null;
}

/**
 * @param {number} year
 */
export async function createConferenceAccessKeyRecord({ conferenceId, email, year, userId }) {
  const suffix = generateAccessKeySuffix(8);
  const fullKey = formatAccessKey(year, suffix);
  const keyHash = await hashAccessKey(fullKey);

  const record = await prisma.conferenceAccessKey.create({
    data: {
      conferenceId,
      email,
      keyHash,
      keySuffix: suffix,
      conferenceYear: year,
      userId: userId ?? null,
      label: displayAccessKey(year, suffix),
    },
  });

  return { record, fullKey, displayKey: displayAccessKey(year, suffix), suffix };
}
