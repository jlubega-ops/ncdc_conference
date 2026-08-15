"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ForcedPasswordChangeDialog } from "@/components/auth/ForcedPasswordChangeDialog";
import { RoleSwitchOverlay } from "@/components/auth/RoleSwitchOverlay";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";
import { STAFF_IDLE_TTL_MS } from "@/lib/auth/session-config";

const SessionContext = createContext(null);

/** How often active staff sessions ping the server to slide idle expiry */
const STAFF_KEEPALIVE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
/** How often we check whether staff have been idle too long */
const STAFF_IDLE_CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds
/** Attendees: occasional session check (absolute 5-day expiry; no idle logout) */
const ATTENDEE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Auth endpoints that return 401 for bad credentials — do not treat as session expiry.
 * @param {string} url
 */
function isCredentialAuthUrl(url) {
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url.split("?")[0];
    return (
      path === "/api/auth/login" ||
      path === "/api/auth/access" ||
      path === "/api/auth/forgot-password" ||
      path === "/api/auth/reset-password"
    );
  } catch {
    return false;
  }
}

/**
 * @param {RequestInfo | URL} input
 */
function requestUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (input && typeof input === "object" && "url" in input) return String(input.url);
  return "";
}

export function SessionProvider({ children, initialSession = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(initialSession);
  const [sessionReady, setSessionReady] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchTarget, setSwitchTarget] = useState(null);
  const [, startTransition] = useTransition();
  const activityRef = useRef(true);
  const lastTouchRef = useRef(0);
  const redirectingRef = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const redirectToLogin = useCallback(
    (reason = "session_expired") => {
      if (redirectingRef.current) return;
      if (pathname === "/login" || pathname?.startsWith("/login/") || pathname === "/access") {
        setSession(null);
        return;
      }
      redirectingRef.current = true;
      setSession(null);
      const redirectPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : pathname || "/dashboard";
      // Conference deep links should return via access-code sign-in, not staff login.
      const useAccess =
        redirectPath.startsWith("/conferences/") ||
        pathname?.startsWith("/conferences/");
      const base = useAccess ? "/access" : "/login";
      const loginUrl = `${base}?redirect=${encodeURIComponent(redirectPath)}&reason=${encodeURIComponent(reason)}`;
      startTransition(() => {
        router.push(loginUrl);
        router.refresh();
      });
    },
    [pathname, router],
  );

  const handleSessionExpired = useCallback(async () => {
    if (redirectingRef.current) return;
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      /* ignore */
    }
    redirectToLogin("session_expired");
  }, [redirectToLogin]);

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/auth/session", { credentials: "same-origin" });
    const data = await res.json();
    const next = data.session ?? null;
    setSession(next);
    if (next) {
      lastTouchRef.current = Date.now();
      redirectingRef.current = false;
    }
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshSession();
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setSession(null);
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }, [router]);

  const switchRole = useCallback(
    async (role) => {
      if (!session || role === session.activeRole) return;
      setSwitchTarget(role);
      setSwitching(true);
      try {
        const res = await fetch("/api/auth/switch-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ role }),
        });
        const data = await res.json();
        if (res.status === 401) {
          await handleSessionExpired();
          return;
        }
        if (!res.ok) throw new Error(data.error ?? "Failed to switch role");
        setSession(data.session);
        lastTouchRef.current = Date.now();
        const target = getDefaultDashboardPath(data.session);
        startTransition(() => {
          router.push(target);
          router.refresh();
        });
      } finally {
        setSwitching(false);
        setSwitchTarget(null);
      }
    },
    [session, router, handleSessionExpired],
  );

  // Global: any authenticated API 401 → clear session and go to login
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const res = await originalFetch(input, init);
      if (res.status !== 401) return res;

      const url = requestUrl(input);
      if (!url.includes("/api/")) return res;
      if (isCredentialAuthUrl(url)) return res;
      if (!sessionRef.current && !initialSession) return res;

      // Clone-safe: redirect without consuming the body for callers
      void handleSessionExpired();
      return res;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [handleSessionExpired, initialSession]);

  // Sliding idle expiry for staff; absolute lifetime check for attendees
  useEffect(() => {
    if (!session) return undefined;

    const isAttendee = session.activeRole === "ATTENDEE";
    lastTouchRef.current = Date.now();
    activityRef.current = true;

    const checkSession = async () => {
      try {
        const next = await refreshSession();
        if (!next) {
          await handleSessionExpired();
        }
      } catch {
        /* network blip */
      }
    };

    const markActive = () => {
      activityRef.current = true;
      const now = Date.now();
      const idleFor = now - lastTouchRef.current;
      lastTouchRef.current = now;
      // Staff: if returning after a long idle gap, verify immediately
      if (
        !isAttendee &&
        idleFor >= STAFF_IDLE_TTL_MS
      ) {
        void checkSession();
      }
    };

    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    for (const event of events) {
      window.addEventListener(event, markActive, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        activityRef.current = true;
        lastTouchRef.current = Date.now();
        void checkSession();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Staff: force logout after 30 minutes with no interaction
    const idleCheckId = isAttendee
      ? null
      : window.setInterval(() => {
          if (document.visibilityState !== "visible") return;
          const idleFor = Date.now() - lastTouchRef.current;
          if (idleFor >= STAFF_IDLE_TTL_MS) {
            void handleSessionExpired();
          }
        }, STAFF_IDLE_CHECK_INTERVAL_MS);

    // Keepalive / periodic verify
    const keepaliveId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;

      if (isAttendee) {
        void checkSession();
        return;
      }

      // Staff: only slide expiry when the user has been interacting
      if (!activityRef.current) return;
      const elapsed = Date.now() - lastTouchRef.current;
      if (elapsed > STAFF_KEEPALIVE_INTERVAL_MS) return;

      activityRef.current = false;
      void checkSession();
    }, isAttendee ? ATTENDEE_CHECK_INTERVAL_MS : STAFF_KEEPALIVE_INTERVAL_MS);

    return () => {
      for (const event of events) {
        window.removeEventListener(event, markActive);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      if (idleCheckId) window.clearInterval(idleCheckId);
      window.clearInterval(keepaliveId);
    };
  }, [session, refreshSession, handleSessionExpired]);

  const value = useMemo(
    () => ({
      session,
      sessionReady,
      isAuthenticated: Boolean(session),
      refreshSession,
      logout,
      switchRole,
      switching,
      handleSessionExpired,
    }),
    [session, sessionReady, refreshSession, logout, switchRole, switching, handleSessionExpired],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
      <ForcedPasswordChangeDialog />
      <RoleSwitchOverlay active={switching} targetRole={switchTarget} />
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
