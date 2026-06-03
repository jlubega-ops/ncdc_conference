"use client";

import { useRouter } from "next/navigation";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";
import { useSession } from "@/components/auth/SessionProvider";

export function ForcedPasswordChangeDialog() {
  const router = useRouter();
  const { session, refreshSession } = useSession();
  const mustChange = session?.user?.mustChangePassword;

  if (!mustChange) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="forced-password-title"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg">
        <h2 id="forced-password-title" className="text-lg font-semibold text-foreground">
          Set your password
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Before you continue, enter the temporary password from your welcome email and choose a
          new password. Your account will be activated once you save it.
        </p>
        <div className="mt-5">
          <PasswordChangeForm
            mustChangePassword
            compact
            submitLabel="Activate account"
            onSuccess={async () => {
              await refreshSession();
              router.push("/dashboard/my-registrations");
              router.refresh();
            }}
          />
        </div>
      </div>
    </div>
  );
}
