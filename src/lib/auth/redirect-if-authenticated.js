import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";

/**
 * If the visitor is already signed in, send them to their role home.
 * Use on public auth / browse pages that signed-in users should not open.
 * @returns {Promise<null>}
 */
export async function redirectIfAuthenticated() {
  let session = null;
  try {
    session = await getCurrentSession();
  } catch {
    /* session unavailable — allow public page */
    return null;
  }

  if (session) {
    // Must not wrap redirect() in try/catch — Next.js implements redirect via throw.
    redirect(getDefaultDashboardPath(session));
  }

  return null;
}
