import Link from "next/link";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { PublicFormLayout } from "@/components/layout/PublicFormLayout";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";

export const metadata = {
  title: "Sign in | Conference Management",
  description: "Sign in with an access code or staff credentials.",
};

export default async function LoginPage({ searchParams }) {
  await redirectIfAuthenticated();

  const params = await searchParams;
  const redirectTo = params?.redirect;
  const expired = params?.reason === "session_expired";

  return (
    <PublicFormLayout
      maxWidth="md"
      eyebrow="Account"
      title="Sign in"
      subtitle="Attendees use an access code to open their conference. Staff use email and password."
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
