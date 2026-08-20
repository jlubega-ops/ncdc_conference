import { randomBytes } from "crypto";
import { ACCESS_KEY_CHARSET } from "@/lib/auth/access-key";

/**
 * Generates a readable temporary password (uppercase, no ambiguous chars).
 */
export function generateTemporaryPassword(length = 10) {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += ACCESS_KEY_CHARSET[bytes[i] % ACCESS_KEY_CHARSET.length];
  }
  return result;
}

/**
 * Prisma fields when issuing a default password the user must change.
 * @param {string} plain
 */
export function pendingTemporaryPasswordData(plain) {
  return {
    mustChangePassword: true,
    temporaryPassword: plain,
  };
}

/** Prisma fields after the user sets their own password. */
export const clearedTemporaryPasswordData = {
  mustChangePassword: false,
  temporaryPassword: null,
};
