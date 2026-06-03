"use client";

import { useRouter } from "next/navigation";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";
import { useSession } from "@/components/auth/SessionProvider";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { session, refreshSession } = useSession();
  const mustChange = session?.user?.mustChangePassword;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-foreground">
        {mustChange ? "Set your password" : "Change password"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mustChange
          ? "Use the temporary password from your welcome email, then choose a new password."
          : "Enter your current password and choose a new one."}
      </p>
      <div className="mt-6">
        <PasswordChangeForm
          mustChangePassword={mustChange}
          onSuccess={async () => {
            await refreshSession();
            router.push("/dashboard/my-registrations");
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
