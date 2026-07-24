import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  getCurrentSession,
  getSessionTokenFromCookie,
  setSessionCookie,
} from "@/lib/auth/session";

/**
 * Returns the current session and slides idle expiry (cookie + DB).
 * Clears a stale cookie when the server session is gone/expired.
 */
export async function GET() {
  const session = await getCurrentSession();
  const response = NextResponse.json({ session });
  const token = await getSessionTokenFromCookie();

  if (session && token) {
    await setSessionCookie(response, token, session.activeRole);
  } else if (token) {
    // Cookie still present after idle expiry or logout — clear it so proxy/auth pages behave.
    await clearSessionCookie(response);
  }

  return response;
}
