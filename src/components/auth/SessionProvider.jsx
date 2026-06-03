"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ForcedPasswordChangeDialog } from "@/components/auth/ForcedPasswordChangeDialog";
import { RoleSwitchOverlay } from "@/components/auth/RoleSwitchOverlay";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";

const SessionContext = createContext(null);

export function SessionProvider({ children, initialSession = null }) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [switching, setSwitching] = useState(false);
  const [switchTarget, setSwitchTarget] = useState(null);
  const [, startTransition] = useTransition();

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/auth/session", { credentials: "same-origin" });
    const data = await res.json();
    setSession(data.session ?? null);
    return data.session;
  }, []);

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
        if (!res.ok) throw new Error(data.error ?? "Failed to switch role");
        setSession(data.session);
        const target = getDefaultDashboardPath(role);
        startTransition(() => {
          router.push(target);
          router.refresh();
        });
      } finally {
        setSwitching(false);
        setSwitchTarget(null);
      }
    },
    [session, router],
  );

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      refreshSession,
      logout,
      switchRole,
      switching,
    }),
    [session, refreshSession, logout, switchRole, switching],
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
