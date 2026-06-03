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
