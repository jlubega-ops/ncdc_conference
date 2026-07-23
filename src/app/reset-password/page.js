import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Reset password | NCDC Conference Platform",
  description: "Set a new password for your NCDC Conference account.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
