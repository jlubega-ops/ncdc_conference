import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { PublicFormLayout } from "@/components/layout/PublicFormLayout";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";

export const metadata = {
  title: "Sign in | Conference Management",
  description: "Staff sign in with email and password.",
};

export default async function LoginPage({ searchParams }) {
  await redirectIfAuthenticated();

  const params = await searchParams;
  const mode = String(params?.mode || "").toLowerCase();

  // Legacy links used /login?mode=access — attendees now use /access.
  // Conference deep links should also use access-code sign-in.
  const redirectParam = params?.redirect ? String(params.redirect) : "";
  if (
    mode === "access" ||
    mode === "attendee" ||
    redirectParam.startsWith("/conferences/")
  ) {
    const qs = new URLSearchParams();
    if (params?.redirect) qs.set("redirect", String(params.redirect));
    if (params?.reason) qs.set("reason", String(params.reason));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    redirect(`/access${suffix}`);
  }

  const redirectTo = params?.redirect;
  const expired = params?.reason === "session_expired";

  return (
    <PublicFormLayout
      maxWidth="md"
      eyebrow="Staff"
      title="Sign in"
      subtitle="Administrators and reviewers sign in with email and password. Attendees use an access code."
      footer={
        <Link href="/" className="font-medium hover:text-primary">
          ← Back to home
        </Link>
      }
    >
      {expired ? (
        <p className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
          Your session expired due to inactivity. Please sign in again.
        </p>
      ) : null}

      {redirectTo && !expired ? (
        <p className="mb-4 rounded-md bg-primary-light px-3 py-2 text-xs text-primary">
          Sign in to continue to {redirectTo}
        </p>
      ) : null}

      {redirectTo && expired ? (
        <p className="mb-4 rounded-md bg-primary-light px-3 py-2 text-xs text-primary">
          After signing in you will continue to {redirectTo}
        </p>
      ) : null}

      <LoginPanel />
    </PublicFormLayout>
  );
}
