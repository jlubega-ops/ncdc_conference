"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { AccessKeyLoginForm } from "@/components/auth/AccessKeyLoginForm";
import { cn } from "@/lib/cn";

/**
 * Attendee = access code; Staff = email/password.
 */
function LoginModeSwitcher() {
  const searchParams = useSearchParams();
  const initial =
    searchParams.get("mode") === "staff" || searchParams.get("mode") === "password"
      ? "staff"
      : "access";
  const [mode, setMode] = useState(initial);

  return (
    <div className="space-y-5">
      <div className="flex rounded-md border border-border bg-neutral-50 p-1">
        <button
          type="button"
          onClick={() => setMode("access")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "access"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Attendee access
        </button>
        <button
          type="button"
          onClick={() => setMode("staff")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "staff"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Staff sign in
        </button>
      </div>

      {mode === "access" ? (
        <>
          <p className="text-sm text-muted-foreground">
            Enter the access code from your email. You will be signed in and taken to that
            conference.
          </p>
          <AccessKeyLoginForm />
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            For administrators and reviewers with an email and password.
          </p>
          <LoginForm />
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Prefer a dedicated page?{" "}
        <Link href="/access" className="font-medium text-primary hover:underline">
          Open /access
        </Link>
      </p>
    </div>
  );
}

export function LoginPanel() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading sign-in…</p>}>
      <LoginModeSwitcher />
    </Suspense>
  );
}
