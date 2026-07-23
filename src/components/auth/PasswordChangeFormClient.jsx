"use client";

import { useRouter } from "next/navigation";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";
import { useSession } from "@/components/auth/SessionProvider";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";

/**
 * @param {{ mustChangePassword?: boolean }} props
 */
export function PasswordChangeFormClient({ mustChangePassword = false }) {
  const router = useRouter();
  const { session, refreshSession } = useSession();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-foreground">
        {mustChangePassword ? "Set your password" : "Change password"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mustChangePassword
          ? "Use the temporary password from your welcome email, then choose a new password."
          : "Enter your current password and choose a new one."}
      </p>
      <div className="mt-6">
        <PasswordChangeForm
          mustChangePassword={mustChangePassword}
          onSuccess={async () => {
            await refreshSession();
            router.push(getDefaultDashboardPath(session) || "/dashboard");
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
