"use client";

import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

/**
 * Staff email/password sign-in. Attendees use /access.
 */
function StaffLoginContent() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        For administrators and reviewers with an email and password.
      </p>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Have an access code?{" "}
        <Link href="/access" className="font-medium text-primary hover:underline">
          Sign in with access code
        </Link>
      </p>
    </div>
  );
}

export function LoginPanel() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading sign-in…</p>}>
      <StaffLoginContent />
    </Suspense>
  );
}
