import { PasswordChangeFormClient } from "@/components/auth/PasswordChangeFormClient";
import { requireSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Change password | NCDC Dashboard",
};

export default async function ChangePasswordPage() {
  const session = await requireSession();
  if (!session) {
    redirect("/login?redirect=/dashboard/change-password&reason=session_expired");
  }

  return (
    <PasswordChangeFormClient mustChangePassword={Boolean(session.user?.mustChangePassword)} />
  );
}
