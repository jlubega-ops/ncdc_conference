"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/SessionProvider";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";

/**
 * Client-side stand-in for server redirectIfAuthenticated.
 * Keeps public pages static (no cookies() in the layout/page).
 */
export function RedirectIfAuthenticatedClient() {
  const { session, sessionReady } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!sessionReady || !session) return;
    router.replace(getDefaultDashboardPath(session));
  }, [session, sessionReady, router]);

  return null;
}
